// Simple Woordelys Tooltip System - Updated URLs v2
// Dynamically loads woordelys pages and highlights terms with hover cards

class WoordelysTooltips {
    constructor() {
        this.wordList = new Map();
        this.init();
    }

    async init() {
        await this.loadWoordelysPages();
        this.processCurrentPage();
        this.addStyles();
    }

    async loadWoordelysPages() {
        try {
            // Dynamically discover all woordelys HTML files by scraping the woordelys index page
            const indexUrl = '/aletheia/woordelys.html';
            const indexRes = await fetch(indexUrl);
            const indexHtml = await indexRes.text();
            const parser = new DOMParser();
            const indexDoc = parser.parseFromString(indexHtml, 'text/html');
            // Find all links to woordelys entries
            const links = Array.from(indexDoc.querySelectorAll('a[href^="/aletheia/woordelys/"]'));
            const pageUrls = links
                .map(a => a.getAttribute('href'))
                .filter(href => href.endsWith('.html'));
            // Remove duplicates
            const uniqueUrls = [...new Set(pageUrls)];
            for (const url of uniqueUrls) {
                await this.loadWoordelysPage(url);
            }
            console.log(`Loaded ${this.wordList.size} woordelys terms (from front matter variations)`);
        } catch (error) {
            console.error('Error loading woordelys pages:', error);
        }
    }

    async loadWoordelysPage(url) {
        try {
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const title = doc.querySelector('h1')?.textContent.trim();
            const content = doc.querySelector('article, .content, main')?.innerHTML || doc.querySelector('body').innerHTML;
            // Get variations from script tag
            let variations = [];
            const varScript = doc.getElementById('woordelys-variations');
            if (varScript) {
                try {
                    variations = JSON.parse(varScript.textContent);
                } catch (e) {
                    console.warn('Could not parse variations for', url);
                }
            }
            // Always include the base word (title)
            if (title && !variations.includes(title.toLowerCase())) {
                variations.push(title.toLowerCase());
            }
            // Register each variation
            for (const v of variations) {
                if (v && v.length > 2) {
                    this.wordList.set(v.toLowerCase(), { title, content, url });
                }
            }
        } catch (error) {
            console.error(`Error loading woordelys page ${url}:`, error);
        }
    }

    // No longer needed: all variations come from front matter

    processCurrentPage() {
        // Skip if we're on a woordelys page
        if (window.location.pathname.includes('/woordelys/')) {
            return;
        }

        // Find the main content area
        const contentArea = document.querySelector('article, .prose, main, .content') || 
                           document.querySelector('body');
        
        if (!contentArea) return;

        // Process text nodes in the content area
        this.processElement(contentArea);
    }

    processElement(element) {
        // Skip if element is already processed or is navigation
        if (element.classList.contains('woordelys-processed') ||
            element.closest('nav, header, .navigation, code, pre, script, style')) {
            return;
        }

        // Only process children that are not links, headings, or buttons
        const forbidden = ['A', 'BUTTON', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SCRIPT', 'STYLE', 'CODE', 'PRE', 'NAV', 'HEADER'];
        for (const child of Array.from(element.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
                // Only process if parent is not inside an attribute value
                // (i.e., only process if parent is an element node)
                if (element.nodeType === Node.ELEMENT_NODE) {
                    this.processTextNode(child);
                }
            } else if (child.nodeType === Node.ELEMENT_NODE && !forbidden.includes(child.tagName) && !child.classList.contains('woordelys-term')) {
                this.processElement(child);
            }
        }
        element.classList.add('woordelys-processed');
    }

    processTextNode(textNode) {
        const text = textNode.textContent;
        if (!text || !text.trim()) return;

        // Sort words by length (longest first) to avoid partial matches
        const sortedWords = Array.from(this.wordList.keys()).sort((a, b) => b.length - a.length);
        let matchFound = false;
        let nodes = [textNode];

        for (const word of sortedWords) {
            const wordData = this.wordList.get(word);
            const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
            let newNodes = [];
            for (const node of nodes) {
                if (node.nodeType !== Node.TEXT_NODE) {
                    newNodes.push(node);
                    continue;
                }
                let lastIndex = 0;
                let str = node.textContent;
                let m;
                regex.lastIndex = 0;
                while ((m = regex.exec(str)) !== null) {
                    if (m.index > lastIndex) {
                        newNodes.push(document.createTextNode(str.slice(lastIndex, m.index)));
                    }
                    // Create the span for the matched word
                    const span = document.createElement('span');
                    span.className = 'woordelys-term';
                    span.setAttribute('data-title', this.escapeHtml(wordData.title));
                    span.setAttribute('data-url', wordData.url);
                    span.textContent = m[0];
                    newNodes.push(span);
                    matchFound = true;
                    lastIndex = m.index + m[0].length;
                }
                if (lastIndex < str.length) {
                    newNodes.push(document.createTextNode(str.slice(lastIndex)));
                }
            }
            nodes = newNodes;
        }

        if (matchFound) {
            const frag = document.createDocumentFragment();
            nodes.forEach(n => frag.appendChild(n));
            textNode.parentNode.replaceChild(frag, textNode);
        }
    }

    createWordSpan(word, data) {
        return `<span class="woordelys-term" data-title="${this.escapeHtml(data.title)}" data-url="${data.url}">${word}</span>`;
    }

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addStyles() {
    const style = document.createElement('style');
        // Remove any existing style tag for woordelys-card to avoid stacking
        const existing = document.getElementById('woordelys-card-style');
        if (existing) existing.remove();
        style.id = 'woordelys-card-style';
        style.textContent = `/* Woordelys Card CSS v20250811 - fix bold/italic */
            .woordelys-card {
                font-family: inherit;
                font-weight: normal;
                font-style: normal;
                box-sizing: border-box;
            }
            .woordelys-card strong, .woordelys-card b, .woordelys-card h1, .woordelys-card h2, .woordelys-card h3 {
                font-weight: bold;
            }
            .woordelys-card em, .woordelys-card i, .woordelys-card blockquote {
                font-style: italic;
            }
            .woordelys-card p,
            .woordelys-card li,
            .woordelys-card ul,
            .woordelys-card ol {
                font-size: 18px;
                line-height: 1.35;
                margin: 0 0 2px 0;
            }
            .woordelys-term {
                color: #B54545;
                text-decoration: underline;
                text-decoration-style: dotted;
                cursor: help;
                position: relative;
            }

            .woordelys-term:hover {
                color: #8B3A3A;
            }

            .woordelys-card {
                position: absolute;
                bottom: 100%;
                left: 50%;
                transform: translateX(-50%);
                background: #fffbe6;
                border: 1px solid #D7D5D1;
                border-radius: 8px;
                padding: 16px;
                max-width: 640px;
                width: max-content;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
                z-index: 1000;
                opacity: 0;
                visibility: hidden;
                transition: opacity 0.2s ease, visibility 0.2s ease;
                margin-bottom: 4px;
                font-size: 14px;
                line-height: 1.3;
            }

            .woordelys-term:hover .woordelys-card {
                opacity: 1;
                visibility: visible;
            }

            .woordelys-card h1, .woordelys-card h2, .woordelys-card h3 {
                color: #B54545 !important;
                font-size: 20px !important;
                margin: 0 0 2px 0;
            }

            .woordelys-card p {
                color: #2B2826 !important;
            }

            .woordelys-card blockquote,
            .woordelys-card blockquote * {
                font-size: 18px !important;
                line-height: 1.2 !important;
            }
            .woordelys-card blockquote {
                margin: 2px 0;
                padding-left: 8px;
                border-left: 2px solid #B54545 !important;
                font-style: italic;
                color: #423F38 !important;
                background: #f9f7ed;
            }

            @media (max-width: 768px) {
                .woordelys-card {
                    max-width: 480px;
                    font-size: 11px;
                    padding: 12px;
                }
            }
        `;
    document.head.appendChild(style);

        // Add hover event listeners
        document.addEventListener('mouseover', this.handleMouseOver.bind(this));
        document.addEventListener('mouseout', this.handleMouseOut.bind(this));
    }

    async handleMouseOver(event) {
        if (!event.target.classList.contains('woordelys-term')) return;

        // Remove any existing cards
        document.querySelectorAll('.woordelys-card').forEach(card => card.remove());

        const term = event.target;
        const title = term.dataset.title;
        const url = term.dataset.url;

        try {
            // Fetch the full content
            const response = await fetch(url);
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Extract the content
            let content = doc.querySelector('article .prose, .prose, article, main')?.innerHTML || '';


            // Sanitize: Recursively unwrap <strong>, <em>, or <p> containing only <strong>/<em>
            function unwrapFullFormatting(html) {
                let temp = document.createElement('div');
                temp.innerHTML = html.trim();
                let node = temp.firstChild;
                // Unwrap <p> if it contains only <strong> or <em>
                while (
                    temp.childNodes.length === 1 &&
                    node && (
                        node.tagName === 'STRONG' ||
                        node.tagName === 'EM' ||
                        (node.tagName === 'P' && node.childNodes.length === 1 &&
                            (node.firstChild.tagName === 'STRONG' || node.firstChild.tagName === 'EM'))
                    )
                ) {
                    if (node.tagName === 'P' && node.childNodes.length === 1 &&
                        (node.firstChild.tagName === 'STRONG' || node.firstChild.tagName === 'EM')) {
                        node = node.firstChild;
                    }
                    temp.innerHTML = node.innerHTML;
                    node = temp.firstChild;
                }
                return temp.innerHTML;
            }
            content = unwrapFullFormatting(content);
            // DEBUG: Log the sanitized HTML content to the console
            console.log('WOORDELYS CARD CONTENT:', content);

            // Create and show the card
            const card = document.createElement('div');
            card.className = 'woordelys-card';
            card.innerHTML = content;

            term.appendChild(card);
            
            // Show the card
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.visibility = 'visible';
            }, 10);
            
        } catch (error) {
            console.error('Error loading woordelys content:', error);
        }
    }

    handleMouseOut(event) {
        if (!event.target.classList.contains('woordelys-term')) return;
        
        // Hide and remove the card after a short delay
        setTimeout(() => {
            const card = event.target.querySelector('.woordelys-card');
            if (card) {
                card.remove();
            }
        }, 100);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WoordelysTooltips();
});
