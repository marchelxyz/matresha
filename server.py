#!/usr/bin/env python3
"""
Simple HTTP server for Business Assistant Telegram Mini App
"""

import http.server
import socketserver
import os
import sys
from urllib.parse import urlparse, parse_qs

class BusinessAssistantHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)
    
    def end_headers(self):
        # Add CORS headers for development
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        super().end_headers()
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()
    
    def do_GET(self):
        # Handle root path
        if self.path == '/':
            self.path = '/index.html'
        return super().do_GET()
    
    def do_POST(self):
        # Handle API requests
        if self.path.startswith('/api/'):
            self.handle_api_request()
        else:
            self.send_error(404, "Not Found")
    
    def handle_api_request(self):
        """Handle mock API requests"""
        content_length = int(self.headers.get('Content-Length', 0))
        post_data = self.rfile.read(content_length)
        
        # Parse request data
        try:
            import json
            data = json.loads(post_data.decode('utf-8'))
        except:
            data = {}
        
        # Mock response based on endpoint
        response_data = self.get_mock_response(self.path, data)
        
        # Send response
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        import json
        self.wfile.write(json.dumps(response_data).encode('utf-8'))
    
    def get_mock_response(self, path, data):
        """Generate mock API responses"""
        mock_responses = {
            '/api/health': {
                'status': 'ok',
                'timestamp': '2024-01-01T00:00:00Z',
                'version': '1.0.0'
            },
            '/api/ai/chat': {
                'success': True,
                'data': {
                    'response': 'Это демонстрационный ответ AI-ассистента. В реальном приложении здесь будет интеллектуальный ответ на основе вашего запроса.',
                    'suggestions': [
                        'Расскажи подробнее',
                        'Покажи примеры',
                        'Создай отчет'
                    ]
                }
            }
        }
        
        return mock_responses.get(path, {
            'success': False,
            'error': 'Endpoint not implemented'
        })

def main():
    PORT = 8000
    
    # Check if port is available
    try:
        with socketserver.TCPServer(("", PORT), BusinessAssistantHandler) as httpd:
            print(f"🚀 Business Assistant server running at http://localhost:{PORT}")
            print("📱 Open this URL in your browser to test the app")
            print("🛑 Press Ctrl+C to stop the server")
            httpd.serve_forever()
    except OSError as e:
        if e.errno == 98:  # Address already in use
            print(f"❌ Port {PORT} is already in use. Try a different port:")
            print(f"   python server.py {PORT + 1}")
        else:
            print(f"❌ Error starting server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        try:
            PORT = int(sys.argv[1])
        except ValueError:
            print("❌ Invalid port number. Using default port 8000.")
            PORT = 8000
    else:
        PORT = 8000
    
    main()