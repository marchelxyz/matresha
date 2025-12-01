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
            
            // Line breaks
            { pattern: /\n\n/g, replacement: '</p><p>' },
            { pattern: /\n/g, replacement: '<br />' },
        ];
    }
    
    parse(text) {
        if (!text) return '';
        
        // Wrap in paragraph tags
        let html = '<p>' + text + '</p>';
        
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