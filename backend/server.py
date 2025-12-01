#!/usr/bin/env python3
"""
AI Assistant Backend Server
Supports multiple AI providers: OpenAI, Gemini, Claude, Groq, Mistral
"""

import os
import json
import time
from datetime import datetime
from flask import Flask, request, jsonify, Response, stream_with_context, g
from flask_cors import CORS
from dotenv import load_dotenv
from contextlib import contextmanager

# Import database
from database import SessionLocal, Chat, Message, get_db

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
    
    def generate(self, message, temperature=0.7, max_tokens=2000, messages=None, **kwargs):
        if not self.client:
            raise ValueError("OpenAI API key not configured")
        
        # Use provided messages history or create new from single message
        if messages:
            message_list = messages
        else:
            message_list = [{"role": "user", "content": message}]
        
        response = self.client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=message_list,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
    
    def stream(self, message, temperature=0.7, max_tokens=2000, messages=None, **kwargs):
        if not self.client:
            raise ValueError("OpenAI API key not configured")
        
        # Use provided messages history or create new from single message
        if messages:
            message_list = messages
        else:
            message_list = [{"role": "user", "content": message}]
        
        stream = self.client.chat.completions.create(
            model="gpt-4-turbo-preview",
            messages=message_list,
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
    
    def generate(self, message, temperature=0.7, max_tokens=2000, messages=None, **kwargs):
        if not self.model:
            raise ValueError("Gemini API key not configured")
        
        # Gemini uses conversation history differently - combine messages
        if messages:
            # Combine all messages into a single text with context
            combined = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
            input_text = combined
        else:
            input_text = message
        
        response = self.model.generate_content(
            input_text,
            generation_config={
                "temperature": temperature,
                "max_output_tokens": max_tokens,
            }
        )
        
        return response.text
    
    def stream(self, message, temperature=0.7, max_tokens=2000, messages=None, **kwargs):
        if not self.model:
            raise ValueError("Gemini API key not configured")
        
        # Gemini uses conversation history differently - combine messages
        if messages:
            combined = "\n".join([f"{m['role']}: {m['content']}" for m in messages])
            input_text = combined
        else:
            input_text = message
        
        response = self.model.generate_content(
            input_text,
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
    
    def generate(self, message, temperature=0.7, max_tokens=2000, messages=None, **kwargs):
        if not self.client:
            raise ValueError("Anthropic API key not configured")
        
        # Use provided messages history or create new from single message
        if messages:
            message_list = messages
        else:
            message_list = [{"role": "user", "content": message}]
        
        response = self.client.messages.create(
            model="claude-3-opus-20240229",
            max_tokens=max_tokens,
            temperature=temperature,
            messages=message_list
        )
        
        return response.content[0].text
    
    def stream(self, message, temperature=0.7, max_tokens=2000, messages=None, **kwargs):
        if not self.client:
            raise ValueError("Anthropic API key not configured")
        
        # Use provided messages history or create new from single message
        if messages:
            message_list = messages
        else:
            message_list = [{"role": "user", "content": message}]
        
        with self.client.messages.stream(
            model="claude-3-opus-20240229",
            max_tokens=max_tokens,
            temperature=temperature,
            messages=message_list
        ) as stream:
            for text in stream.text_stream:
                yield text


class GroqProvider(AIProvider):
    """Groq (Llama) Provider"""
    
    def __init__(self, api_key=None):
        super().__init__(api_key or os.getenv('GROQ_API_KEY'))
        try:
            from groq import Groq
            # Groq client initialization - updated to work with groq >= 0.36.0
            if self.api_key:
                self.client = Groq(api_key=self.api_key)
            else:
                self.client = None
        except ImportError:
            self.client = None
        except Exception as e:
            # Log the error for debugging
            error_msg = str(e)
            print(f"ERROR: Failed to initialize Groq client: {error_msg}")
            import traceback
            traceback.print_exc()
            self.client = None
    
    def generate(self, message, temperature=0.7, max_tokens=2000, messages=None, **kwargs):
        if not self.client:
            raise ValueError("Groq API key not configured")
        
        # Use provided messages history or create new from single message
        if messages:
            message_list = messages
        else:
            message_list = [{"role": "user", "content": message}]
        
        response = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=message_list,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
    
    def stream(self, message, temperature=0.7, max_tokens=2000, messages=None, **kwargs):
        if not self.client:
            raise ValueError("Groq API key not configured")
        
        # Use provided messages history or create new from single message
        if messages:
            message_list = messages
        else:
            message_list = [{"role": "user", "content": message}]
        
        stream = self.client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=message_list,
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
    
    def generate(self, message, temperature=0.7, max_tokens=2000, messages=None, **kwargs):
        if not self.client:
            raise ValueError("Mistral API key not configured")
        
        # Use provided messages history or create new from single message
        if messages:
            message_list = messages
        else:
            message_list = [{"role": "user", "content": message}]
        
        response = self.client.chat.completions.create(
            model="mistral-large-latest",
            messages=message_list,
            temperature=temperature,
            max_tokens=max_tokens
        )
        
        return response.choices[0].message.content
    
    def stream(self, message, temperature=0.7, max_tokens=2000, messages=None, **kwargs):
        if not self.client:
            raise ValueError("Mistral API key not configured")
        
        # Use provided messages history or create new from single message
        if messages:
            message_list = messages
        else:
            message_list = [{"role": "user", "content": message}]
        
        stream = self.client.chat.completions.create(
            model="mistral-large-latest",
            messages=message_list,
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


# Database helper functions
def get_or_create_chat(user_id, user_name=None, username=None, provider='openai'):
    """Get existing chat or create new one for user"""
    db = next(get_db())
    try:
        # Try to get the most recent chat for this user
        chat = db.query(Chat).filter(
            Chat.user_id == str(user_id),
            Chat.provider == provider
        ).order_by(Chat.updated_at.desc()).first()
        
        if not chat:
            # Create new chat
            chat = Chat(
                user_id=str(user_id),
                user_name=user_name,
                username=username,
                provider=provider
            )
            db.add(chat)
            db.commit()
            db.refresh(chat)
        else:
            # Update chat timestamp
            chat.updated_at = datetime.utcnow()
            db.commit()
        
        return chat
    finally:
        db.close()


def save_message(chat_id, role, content, provider=None, temperature=None, max_tokens=None):
    """Save message to database"""
    db = next(get_db())
    try:
        message = Message(
            chat_id=chat_id,
            role=role,
            content=content,
            provider=provider,
            temperature=str(temperature) if temperature else None,
            max_tokens=max_tokens
        )
        db.add(message)
        db.commit()
        db.refresh(message)
        return message
    finally:
        db.close()


def get_chat_history(chat_id, limit=50):
    """Get chat history messages"""
    db = next(get_db())
    try:
        messages = db.query(Message).filter(
            Message.chat_id == chat_id
        ).order_by(Message.created_at.asc()).limit(limit).all()
        
        return [msg.to_dict() for msg in messages]
    finally:
        db.close()


def get_user_chats(user_id, limit=10):
    """Get user's chat sessions"""
    db = next(get_db())
    try:
        chats = db.query(Chat).filter(
            Chat.user_id == str(user_id)
        ).order_by(Chat.updated_at.desc()).limit(limit).all()
        
        return [chat.to_dict() for chat in chats]
    finally:
        db.close()


def get_chat_with_messages(chat_id):
    """Get chat with all messages"""
    db = next(get_db())
    try:
        chat = db.query(Chat).filter(Chat.id == chat_id).first()
        if chat:
            chat_dict = chat.to_dict()
            chat_dict['messages'] = get_chat_history(chat_id)
            return chat_dict
        return None
    finally:
        db.close()


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
        
        # Get user info
        user_data = data.get('user', {})
        user_id = user_data.get('id') if user_data else None
        user_name = user_data.get('first_name') if user_data else None
        username = user_data.get('username') if user_data else None
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
        
        # Get or create chat session
        chat = None
        messages_history = []
        if user_id:
            chat = get_or_create_chat(user_id, user_name, username, provider_name)
            # Load chat history
            history = get_chat_history(chat.id)
            # Convert to format expected by providers
            messages_history = [
                {"role": msg['role'], "content": msg['content']}
                for msg in history
            ]
        
        provider = get_provider(provider_name)
        
        # Add current user message to history
        messages_history.append({"role": "user", "content": message})
        
        response = provider.generate(
            message,
            temperature=temperature,
            max_tokens=max_tokens,
            messages=messages_history if messages_history else None
        )
        
        # Save messages to database
        if chat and user_id:
            save_message(chat.id, "user", message, provider_name, temperature, max_tokens)
            save_message(chat.id, "assistant", response, provider_name, temperature, max_tokens)
        
        return jsonify({
            'success': True,
            'data': {
                'response': response,
                'provider': provider_name,
                'chat_id': chat.id if chat else None
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
        
        # Логирование для отладки
        if not data:
            print("ERROR: Request body is None or empty")
            return jsonify({
                'success': False,
                'error': 'Request body is required (JSON)'
            }), 400
        
        # Логируем полученные данные (без чувствительной информации)
        print(f"DEBUG: Received stream request - provider: {data.get('provider')}, "
              f"has_message: {bool(data.get('message'))}, "
              f"message_length: {len(data.get('message', ''))}")
        
        message = data.get('message', '')
        provider_name = data.get('provider', 'openai')
        
        # Get user info
        user_data = data.get('user', {})
        user_id = user_data.get('id') if user_data else None
        user_name = user_data.get('first_name') if user_data else None
        username = user_data.get('username') if user_data else None
        
        # Безопасное получение параметров с валидацией
        try:
            temperature = float(data.get('temperature', 0.7))
        except (ValueError, TypeError):
            temperature = 0.7
        
        try:
            max_tokens = int(data.get('maxTokens', 2000))
        except (ValueError, TypeError):
            max_tokens = 2000
        
        if not message:
            return jsonify({
                'success': False,
                'error': 'Message is required'
            }), 400
        
        if not isinstance(message, str) or len(message.strip()) == 0:
            print(f"ERROR: Invalid message - type: {type(message)}, value: {repr(message)}")
            return jsonify({
                'success': False,
                'error': 'Message must be a non-empty string'
            }), 400
        
        try:
            provider = get_provider(provider_name)
        except ValueError as e:
            print(f"ERROR: Provider error - {str(e)}")
            return jsonify({
                'success': False,
                'error': str(e)
            }), 400
        
        # Get or create chat session
        chat = None
        messages_history = []
        if user_id:
            chat = get_or_create_chat(user_id, user_name, username, provider_name)
            # Load chat history
            history = get_chat_history(chat.id)
            # Convert to format expected by providers
            messages_history = [
                {"role": msg['role'], "content": msg['content']}
                for msg in history
            ]
        
        # Add current user message to history
        messages_history.append({"role": "user", "content": message})
        
        # Save user message to database
        if chat and user_id:
            save_message(chat.id, "user", message, provider_name, temperature, max_tokens)
        
        def generate():
            full_response = ""
            try:
                for chunk in provider.stream(
                    message,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    messages=messages_history if messages_history else None
                ):
                    full_response += chunk
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Save assistant response to database
                if chat and user_id and full_response:
                    save_message(chat.id, "assistant", full_response, provider_name, temperature, max_tokens)
                
                yield "data: [DONE]\n\n"
            except Exception as e:
                # Log the full error for debugging
                error_msg = str(e)
                print(f"ERROR: Stream generation failed - {error_msg}")
                import traceback
                traceback.print_exc()
                yield f"data: {json.dumps({'error': error_msg})}\n\n"
        
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


@app.route('/api/chat/history', methods=['GET'])
@app.route('/chat/history', methods=['GET'])
def get_chat_history_endpoint():
    """Get chat history for user"""
    try:
        user_id = request.args.get('user_id')
        chat_id = request.args.get('chat_id')
        limit = int(request.args.get('limit', 50))
        
        if not user_id and not chat_id:
            return jsonify({
                'success': False,
                'error': 'user_id or chat_id is required'
            }), 400
        
        if chat_id:
            # Get specific chat with messages
            chat = get_chat_with_messages(int(chat_id))
            if not chat:
                return jsonify({
                    'success': False,
                    'error': 'Chat not found'
                }), 404
            
            return jsonify({
                'success': True,
                'data': chat
            })
        else:
            # Get user's chats
            chats = get_user_chats(user_id, limit=10)
            return jsonify({
                'success': True,
                'data': {
                    'chats': chats
                }
            })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/chat/<int:chat_id>/messages', methods=['GET'])
@app.route('/chat/<int:chat_id>/messages', methods=['GET'])
def get_chat_messages(chat_id):
    """Get messages for a specific chat"""
    try:
        limit = int(request.args.get('limit', 50))
        messages = get_chat_history(chat_id, limit)
        
        return jsonify({
            'success': True,
            'data': {
                'chat_id': chat_id,
                'messages': messages
            }
        })
    
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


if __name__ == '__main__':
    # Development server only - use gunicorn for production
    port = int(os.environ.get('PORT', 8000))
    debug_mode = os.environ.get('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(host='0.0.0.0', port=port, debug=debug_mode)