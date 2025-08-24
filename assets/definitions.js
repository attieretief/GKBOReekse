// Definitions Tooltip System - Updated URLs v2
// Dynamically loads woordelys pages and highlights terms with hover cards

class DefinitionsTooltips {
    constructor() {
        this.wordList = new Map();
        this.init();
    }

    async init() {
        await this.loadWoordelysPages();
        this.processCurrentPage();
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
            console.log(`Loaded ${this.wordList.size} definitions terms (from front matter variations)`);
        } catch (error) {
            console.error('Error loading definitions pages:', error);
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
            console.error(`Error loading definitions page ${url}:`, error);
        }
    }

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
        if (element.classList.contains('definitions-processed') ||
            element.closest('nav, header, .navigation, code, pre, script, style')) {
            return;
        }

        // Only process children that are not links, headings, or buttons
        const forbidden = ['A', 'BUTTON', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SCRIPT', 'STYLE', 'CODE', 'PRE', 'NAV', 'HEADER'];
        for (const child of Array.from(element.childNodes)) {
            if (child.nodeType === Node.TEXT_NODE) {
                this.processTextNode(child);
            } else if (child.nodeType === Node.ELEMENT_NODE && !forbidden.includes(child.tagName)) {
                this.processElement(child);
            }
        }

        element.classList.add('definitions-processed');
    }

    processTextNode(textNode) {
        const str = textNode.textContent;
        let nodes = [textNode];
        let matchFound = false;

        for (const [word, wordData] of this.wordList) {
            const newNodes = [];
            for (const node of nodes) {
                if (node.nodeType === Node.TEXT_NODE) {
                    const text = node.textContent;
                    const regex = new RegExp(`\\b${this.escapeRegex(word)}\\b`, 'gi');
                    let lastIndex = 0;
                    let m;
                    while ((m = regex.exec(text)) !== null) {
                        if (m.index > lastIndex) {
                            newNodes.push(document.createTextNode(text.slice(lastIndex, m.index)));
                        }
                        // Create the span for the matched word
                        const span = document.createElement('span');
                        span.className = 'definitions-term';
                        span.setAttribute('data-title', this.escapeHtml(wordData.title));
                        span.setAttribute('data-url', wordData.url);
                        span.textContent = m[0];
                        newNodes.push(span);
                        matchFound = true;
                        lastIndex = m.index + m[0].length;
                    }
                    if (lastIndex < text.length) {
                        newNodes.push(document.createTextNode(text.slice(lastIndex)));
                    }
                } else {
                    newNodes.push(node);
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

    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    async handleMouseOver(event) {
        if (!event.target.classList.contains('definitions-term')) return;

        // Remove any existing cards
        document.querySelectorAll('.definitions-card').forEach(card => card.remove());

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
            console.log('DEFINITIONS CARD CONTENT:', content);

            // Create and show the card
            const card = document.createElement('div');
            card.className = 'definitions-card';
            card.innerHTML = content;

            term.appendChild(card);
            
            // Show the card
            setTimeout(() => {
                card.style.opacity = '1';
                card.style.visibility = 'visible';
            }, 10);
            
        } catch (error) {
            console.error('Error loading definitions content:', error);
        }
    }

    handleMouseOut(event) {
        if (!event.target.classList.contains('definitions-term')) return;
        
        // Hide and remove the card after a short delay
        setTimeout(() => {
            const card = event.target.querySelector('.definitions-card');
            if (card) {
                card.remove();
            }
        }, 100);
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const definitions = new DefinitionsTooltips();
    
    // Add hover event listeners
    document.addEventListener('mouseover', definitions.handleMouseOver.bind(definitions));
    document.addEventListener('mouseout', definitions.handleMouseOut.bind(definitions));
});
