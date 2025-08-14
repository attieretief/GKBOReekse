#!/bin/bash

# Script to add "author: Attie Retief" to frontmatter of markdown files
# in course directories

# Find all markdown files in the specified directories
find . -name "*.md" \( -path "./gkbo/*" -o -path "./kategismus/*" -o -path "./reeks01-grondslag/*" -o -path "./leerreels/*" -o -path "./belydenisse/*" \) | while read file; do
    echo "Processing: $file"
    
    # Check if the file already has an author field
    if grep -q "^author:" "$file"; then
        echo "  Already has author field, skipping..."
        continue
    fi
    
    # Check if the file has frontmatter (starts with ---)
    if head -1 "$file" | grep -q "^---$"; then
        # Use sed to add author field before the closing ---
        sed -i '' '/^---$/,/^---$/ { 
            /^---$/ {
                # If this is the second --- (closing), add author before it
                /^---$/ {
                    N
                    s/^---$/author: Attie Retief\n---/
                    P
                    D
                }
            }
        }' "$file"
        
        # Alternative approach using awk for more reliable results
        awk '
        BEGIN { in_frontmatter = 0; found_closing = 0 }
        /^---$/ && NR == 1 { in_frontmatter = 1; print; next }
        /^---$/ && in_frontmatter && !found_closing { 
            print "author: Attie Retief"
            print
            found_closing = 1
            next 
        }
        { print }
        ' "$file" > "$file.tmp" && mv "$file.tmp" "$file"
        
        echo "  Added author field"
    else
        echo "  No frontmatter found, skipping..."
    fi
done
