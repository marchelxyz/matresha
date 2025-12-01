#!/usr/bin/env python3
"""
AI Assistant Backend Server
Supports multiple AI providers: OpenAI, Gemini, Claude, Groq, Mistral
"""

import os
import json
import time
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# AI Provider Classes
class AIProvider:
    """Base class for AI providers"""
    
    def __init__(self, api_key=None):
        self.api_key = api_key
    
    def generate(self, message, **kwargs):
        raise NotImplementedError
    
    def stream(self, message, **kwargs):
        raise NotImplementedError


class OpenAIProvider(AIProvider):
    """OpenAI GPT-4 Provider"""
    
    def __init__(self, api_key=None):
        super().__init__(api_key or os.getenv('OPENAI_API_KEY'))
        try:
            import openai
            self.client = openai.OpenAI(api_key=self.api_key) if self.api_key else None
        except ImportError:
            self.client = None
    
    def generate(self, message, temperature=0.7, max_tokens=2000, **kwargs):
        if not self.client:
            raise ValueError("OpenAI API key not configured")
        
        response = self.client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[{"role": "user", "content": message}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
    
    def stream(self, message, temperature=0.7, max_tokens=2000, **kwargs):
        if not self.client:
            raise ValueError("OpenAI API key not configured")
        
        stream = self.client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=[{"role": "user", "content": message}],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


class GeminiProvider(AIProvider):
    """Google Gemini Provider"""
    
    def __init__(self, api_key=None):
        super().__init__(api_key or os.getenv('GEMINI_API_KEY'))
        try:
            import google.generativeai as genai
            if self.api_key:
                genai.configure(api_key=self.api_key)
                self.model = genai.GenerativeModel('gemini-pro')
            else:
                self.model = None
        except ImportError:
            self.model = None
    
    def generate(self, message, temperature=0.7, max_tokens=2000, **kwargs):
        if not self.model:
            raise ValueError("Gemini API key not configured")
        
        response = self.model.generate_content(
            message,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }
        )
        
        return response.text
    
    def stream(self, message, temperature=0.7, max_tokens=2000, **kwargs):
        if not self.model:
            raise ValueError("Gemini API key not configured")
        
        response = self.model.generate_content(
            message,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            },
            stream=True
        )
        
        for chunk in response:
            if chunk.text:
                yield chunk.text


class ClaudeProvider(AIProvider):
    """Anthropic Claude Provider"""
    
    def __init__(self, api_key=None):
        super().__init__(api_key or os.getenv('ANTHROPIC_API_KEY'))
        try:
            from anthropic import Anthropic
            self.client = Anthropic(api_key=self.api_key) if self.api_key else None
        except ImportError:
            self.client = None
    
    def generate(self, message, temperature=0.7, max_tokens=2000, **kwargs):
        if not self.client:
            raise ValueError("Anthropic API key not configured")
        
        response = self.client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": message}]
        )
        
        return response.content[0].text
    
    def stream(self, message, temperature=0.7, max_tokens=2000, **kwargs):
        if not self.client:
            raise ValueError("Anthropic API key not configured")
        
        with self.client.messages.stream(
            model="claude-3-opus-20240229",
            max_tokens=max_tokens,
            temperature=temperature,
            messages=[{"role": "user", "content": message}]
        ) as stream:
            for text in stream.text_stream:
                yield text


class GroqProvider(AIProvider):
    """Groq (Llama) Provider"""
    
    def __init__(self, api_key=None):
        super().__init__(api_key or os.getenv('GROQ_API_KEY'))
        try:
            from groq import Groq
            self.client = Groq(api_key=self.api_key) if self.api_key else None
        except ImportError:
            self.client = None
    
    def generate(self, message, temperature=0.7, max_tokens=2000, **kwargs):
        if not self.client:
            raise ValueError("Groq API key not configured")
        
        response = self.client.chat.completions.create(
            model="llama-3-70b-8192",
            messages=[{"role": "user", "content": message}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
    
    def stream(self, message, temperature=0.7, max_tokens=2000, **kwargs):
        if not self.client:
            raise ValueError("Groq API key not configured")
        
        stream = self.client.chat.completions.create(
            model="llama-3-70b-8192",
            messages=[{"role": "user", "content": message}],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


class MistralProvider(AIProvider):
    """Mistral AI Provider (using OpenAI-compatible API)"""
    
    def __init__(self, api_key=None):
        super().__init__(api_key or os.getenv('MISTRAL_API_KEY'))
        try:
            import openai
            if self.api_key:
                self.client = openai.OpenAI(
                    api_key=self.api_key,
                    base_url="https://api.mistral.ai/v1"
                )
            else:
                self.client = None
        except ImportError:
            self.client = None
    
    def generate(self, message, temperature=0.7, max_tokens=2000, **kwargs):
        if not self.client:
            raise ValueError("Mistral API key not configured")
        
        response = self.client.chat.completions.create(
            model="mistral-large-latest",
            messages=[{"role": "user", "content": message}],
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
    
    def stream(self, message, temperature=0.7, max_tokens=2000, **kwargs):
        if not self.client:
            raise ValueError("Mistral API key not configured")
        
        stream = self.client.chat.completions.create(
            model="mistral-large-latest",
            messages=[{"role": "user", "content": message}],
            temperature=temperature,
            max_tokens=max_tokens,
            stream=True
        )
        
        for chunk in stream:
            if chunk.choices[0].delta.content:
                yield chunk.choices[0].delta.content


# Provider registry
PROVIDERS = {
    'openai': OpenAIProvider,
    'gemini': GeminiProvider,
    'claude': ClaudeProvider,
    'groq': GroqProvider,
    'mistral': MistralProvider
}


def get_provider(provider_name):
    """Get provider instance"""
    provider_class = PROVIDERS.get(provider_name)
    if not provider_class:
        raise ValueError(f"Unknown provider: {provider_name}")
    
    provider = provider_class()
    
    # Check if API key is configured
    if not provider.api_key:
        env_var_name = {
            'openai': 'OPENAI_API_KEY',
            'gemini': 'GEMINI_API_KEY',
            'claude': 'ANTHROPIC_API_KEY',
            'groq': 'GROQ_API_KEY',
            'mistral': 'MISTRAL_API_KEY'
        }.get(provider_name, f'{provider_name.upper()}_API_KEY')
        
        raise ValueError(
            f"{provider_name.capitalize()} API key not configured. "
            f"Please set {env_var_name} environment variable."
        )
    
    return provider


@app.route('/api/health', methods=['GET'])
@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': time.time(),
        'version': '1.0.0'
    })


@app.route('/api/debug/env', methods=['GET'])
@app.route('/debug/env', methods=['GET'])
def debug_env():
    """Debug endpoint to check environment variables (without exposing keys)"""
    env_vars = {}
    for key in os.environ.keys():
        if 'API_KEY' in key or 'KEY' in key:
            value = os.environ.get(key)
            env_vars[key] = {
                'exists': True,
                'has_value': bool(value),
                'length': len(value) if value else 0,
                'starts_with': value[:4] if value and len(value) >= 4 else None,
                'ends_with': value[-4:] if value and len(value) >= 4 else None
            }
    
    return jsonify({
        'success': True,
        'data': {
            'env_vars': env_vars,
            'total_env_vars': len(os.environ),
            'api_key_vars_found': len([k for k in os.environ.keys() if 'API_KEY' in k])
        }
    })


@app.route('/api/providers', methods=['GET'])
@app.route('/providers', methods=['GET'])
def get_providers():
    """Get list of available providers"""
    available = []
    provider_status = {}
    env_vars_status = {}
    
    # Check environment variables directly
    env_var_map = {
        'openai': 'OPENAI_API_KEY',
        'gemini': 'GEMINI_API_KEY',
        'claude': 'ANTHROPIC_API_KEY',
        'groq': 'GROQ_API_KEY',
        'mistral': 'MISTRAL_API_KEY'
    }
    
    for name, env_var in env_var_map.items():
        env_value = os.getenv(env_var)
        env_vars_status[env_var] = {
            'exists': env_value is not None,
            'has_value': bool(env_value),
            'length': len(env_value) if env_value else 0,
            'starts_with': env_value[:4] if env_value and len(env_value) >= 4 else None
        }
    
    for name, provider_class in PROVIDERS.items():
        try:
            provider = provider_class()
            has_key = bool(provider.api_key)
            provider_status[name] = {
                'available': has_key,
                'has_key': has_key,
                'env_var': env_var_map.get(name),
                'env_var_exists': os.getenv(env_var_map.get(name)) is not None
            }
            if has_key:
                available.append(name)
        except Exception as e:
            provider_status[name] = {
                'available': False,
                'error': str(e),
                'env_var': env_var_map.get(name),
                'env_var_exists': os.getenv(env_var_map.get(name)) is not None
            }
    
    return jsonify({
        'success': True,
        'data': {
            'providers': available,
            'all': list(PROVIDERS.keys()),
            'status': provider_status,
            'env_vars': env_vars_status,
            'debug': {
                'python_env_keys': [k for k in os.environ.keys() if 'API_KEY' in k or 'KEY' in k]
            }
        }
    })


@app.route('/api/chat', methods=['POST'])
@app.route('/chat', methods=['POST'])
def chat():
    """Non-streaming chat endpoint"""
    try:
        data = request.get_json()
        message = data.get('message', '')
        provider_name = data.get('provider', 'openai')
        temperature = float(data.get('temperature', 0.7))
        max_tokens = int(data.get('maxTokens', 2000))
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
        
        provider = get_provider(provider_name)
        response = provider.generate(
            message,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return jsonify({
            'success': True,
            'data': {
                'response': response,
                'provider': provider_name
            }
        })
    
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/chat/stream', methods=['POST'])
@app.route('/chat/stream', methods=['POST'])
def chat_stream():
    """Streaming chat endpoint"""
    try:
        data = request.get_json()
        message = data.get('message', '')
        provider_name = data.get('provider', 'openai')
        temperature = float(data.get('temperature', 0.7))
        max_tokens = int(data.get('maxTokens', 2000))
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
        
        provider = get_provider(provider_name)
        
        def generate():
            try:
                for chunk in provider.stream(
                    message,
                    temperature=temperature,
                    max_tokens=max_tokens
                ):
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                yield "data: [DONE]\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )
    
    except ValueError as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port, debug=True)