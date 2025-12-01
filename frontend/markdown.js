// Simple Markdown Parser for Chat Messages
class MarkdownParser {
    constructor() {
        this.rules = [
            // Headers
            { pattern: /^### (.*$)/gm, replacement: '<h3>$1</h3>' },
            { pattern: /^## (.*$)/gm, replacement: '<h2>$1</h2>' },
            { pattern: /^# (.*$)/gm, replacement: '<h1>$1</h1>' },
            
            // Bold
            { pattern: /\*\*(.*?)\*\*/g, replacement: '<strong>$1</strong>' },
            { pattern: /__(.*?)__/g, replacement: '<strong>$1</strong>' },
            
            // Italic
            { pattern: /\*(.*?)\*/g, replacement: '<em>$1</em>' },
            { pattern: /_(.*?)_/g, replacement: '<em>$1</em>' },
            
            // Code blocks
            { pattern: /```(\w+)?\n([\s\S]*?)```/g, replacement: '<pre><code>$2</code></pre>' },
            { pattern: /`([^`]+)`/g, replacement: '<code>$1</code>' },
            
            // Links
            { pattern: /\[([^\]]+)\]\(([^)]+)\)/g, replacement: '<a href="$2" target="_blank" rel="noopener">$1</a>' },
            
            // Images
            { pattern: /!\[([^\]]*)\]\(([^)]+)\)/g, replacement: '<img src="$2" alt="$1" />' },
            
            // Lists
            { pattern: /^\* (.+)$/gm, replacement: '<li>$1</li>' },
            { pattern: /^- (.+)$/gm, replacement: '<li>$1</li>' },
            { pattern: /^\d+\. (.+)$/gm, replacement: '<li>$1</li>' },
            
            // Blockquotes
            { pattern: /^> (.+)$/gm, replacement: '<blockquote>$1</blockquote>' },
            
            // Horizontal rule
            { pattern: /^---$/gm, replacement: '<hr />' },
            
            // Tables (must be processed before line breaks)
            { pattern: /^\|(.+)\|$/gm, replacement: (match, content) => {
                // This will be processed separately
                return match;
            }},
            
            // Line breaks
            { pattern: /\n\n/g, replacement: '</p><p>' },
            { pattern: /\n/g, replacement: '<br />' },
        ];
    }
    
    // Parse markdown tables
    parseTables(text) {
        // Match table blocks (with header separator)
        // Pattern matches: header row, separator row (with dashes), and data rows
        const tablePattern = /(\|[^\n]+\|\s*\n\|[\s\-:|]+\|\s*\n(?:\|[^\n]+\|\s*\n?)+)/g;
        
        return text.replace(tablePattern, (match) => {
            const lines = match.trim().split('\n').map(l => l.trim()).filter(l => l);
            if (lines.length < 2) return match;
            
            // Parse header
            const headerLine = lines[0];
            const headers = headerLine.split('|').map(h => h.trim()).filter(h => h);
            
            if (headers.length === 0) return match;
            
            // Skip separator line (second line)
            const dataLines = lines.slice(2);
            
            let html = '<div class="table-wrapper"><table><thead><tr>';
            headers.forEach(header => {
                html += `<th>${this.parseInline(header)}</th>`;
            });
            html += '</tr></thead><tbody>';
            
            // Parse data rows
            dataLines.forEach(line => {
                if (!line.trim() || !line.includes('|')) return;
                const cells = line.split('|').map(c => c.trim()).filter(c => c);
                if (cells.length === 0) return;
                
                // Ensure we have the same number of cells as headers
                while (cells.length < headers.length) {
                    cells.push('');
                }
                if (cells.length > headers.length) {
                    cells = cells.slice(0, headers.length);
                }
                
                html += '<tr>';
                cells.forEach(cell => {
                    html += `<td>${this.parseInline(cell)}</td>`;
                });
                html += '</tr>';
            });
            
            html += '</tbody></table><button class="copy-table-btn" onclick="copyTableToClipboard(this)" title="Копировать таблицу">📋</button></div>';
            
            return html;
        });
    }
    
    parse(text) {
        if (!text) return '';
        
        // First, parse tables (before wrapping in paragraphs)
        let html = this.parseTables(text);
        
        // Wrap in paragraph tags
        html = '<p>' + html + '</p>';
        
        // Apply rules
        for (const rule of this.rules) {
            html = html.replace(rule.pattern, rule.replacement);
        }
        
        // Wrap lists
        html = html.replace(/(<li>.*<\/li>)/gs, (match) => {
            if (match.includes('<ul>') || match.includes('<ol>')) return match;
            return '<ul>' + match + '</ul>';
        });
        
        // Clean up empty paragraphs
        html = html.replace(/<p><\/p>/g, '');
        html = html.replace(/<p>(<h[1-6]>)/g, '$1');
        html = html.replace(/(<\/h[1-6]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)<\/p>/g, '$1');
        html = html.replace(/<p>(<pre>)/g, '$1');
        html = html.replace(/(<\/pre>)<\/p>/g, '$1');
        html = html.replace(/<p>(<blockquote>)/g, '$1');
        html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');
        html = html.replace(/<p>(<div class="table-wrapper">)/g, '$1');
        html = html.replace(/(<\/div>)<\/p>/g, '$1');
        
        return html;
    }
    
    parseInline(text) {
        if (!text) return '';
        
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`([^`]+)`/g, '<code>$1</code>')
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarkdownParser;
} else {
    window.MarkdownParser = MarkdownParser;
}