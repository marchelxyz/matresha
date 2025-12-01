#!/usr/bin/env python3
"""
AI Assistant Backend Server
Supports multiple AI providers: OpenAI, Gemini, Claude, Groq, Mistral
"""

import os
import json
import time
import base64
import io
from datetime import datetime, timezone
from flask import Flask, request, jsonify, Response, stream_with_context, g
from flask_cors import CORS
from dotenv import load_dotenv
from contextlib import contextmanager
from werkzeug.utils import secure_filename

# Import database
from database import SessionLocal, Chat, Message, get_db

# Import storage
from storage import storage

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
    """Google Gemini Provider with ChatSession support"""
    
    def __init__(self, api_key=None):
        super().__init__(api_key or os.getenv('GEMINI_API_KEY'))
        self.model_name = None
        self.model = None
        self.genai = None
        try:
            import google.generativeai as genai
            self.genai = genai
            if self.api_key:
                genai.configure(api_key=self.api_key)
                # Try models in order - newer models first (gemini-pro is deprecated)
                # gemini-2.5-flash is the newest and fastest
                # gemini-1.5-flash is fast and widely available
                # gemini-1.5-pro is more capable
                model_attempts = [
                    ('gemini-2.5-flash', 'gemini-2.5-flash'),
                    ('gemini-1.5-flash', 'gemini-1.5-flash'),
                    ('gemini-1.5-pro', 'gemini-1.5-pro'),
                    ('gemini-pro', 'gemini-pro'),  # Legacy, may not work with v1beta
                ]
                
                # Try to get list of available models from API
                available_models = set()
                try:
                    for model in genai.list_models():
                        if hasattr(model, 'name'):
                            model_name = model.name.split('/')[-1] if '/' in model.name else model.name
                            available_models.add(model_name)
                except Exception as e:
                    print(f"Gemini: Could not list available models: {str(e)}")
                
                for model_display_name, model_id in model_attempts:
                    try:
                        # Check if model is in available models list (if we got it)
                        if available_models and model_id not in available_models:
                            print(f"Gemini: Model {model_display_name} ({model_id}) not in available models list")
                            continue
                        
                        # Test if model is available by trying to create it
                        test_model = genai.GenerativeModel(model_id)
                        self.model = test_model
                        self.model_name = model_id
                        print(f"Gemini: Successfully initialized model {model_display_name} ({model_id})")
                        break
                    except Exception as e:
                        print(f"Gemini: Model {model_display_name} ({model_id}) not available: {str(e)}")
                        continue
                
                if not self.model:
                    print("Gemini: Warning - No compatible model found. Will attempt to initialize on first request.")
                    # Don't set a default model name, let _ensure_model_initialized handle it
            else:
                print("Gemini: API key not configured")
        except ImportError:
            print("Gemini: google-generativeai library not installed")
            self.model = None
            self.genai = None
    
    def _ensure_model_initialized(self, exclude_models=None):
        """Ensure model is initialized, try to initialize if not
        
        Args:
            exclude_models: List of model names to exclude from attempts
        """
        if self.model:
            return True
        
        if not self.genai or not self.api_key:
            return False
        
        exclude_models = exclude_models or []
        
        # Try to initialize model with fallback - newer models first
        model_attempts = [
            ('gemini-2.5-flash', 'gemini-2.5-flash'),
            ('gemini-1.5-flash', 'gemini-1.5-flash'),
            ('gemini-1.5-pro', 'gemini-1.5-pro'),
            ('gemini-pro', 'gemini-pro'),  # Legacy, may not work with v1beta
        ]
        
        # Try to get list of available models from API
        available_models = set()
        try:
            for model in self.genai.list_models():
                if hasattr(model, 'name'):
                    model_name = model.name.split('/')[-1] if '/' in model.name else model.name
                    available_models.add(model_name)
        except Exception as e:
            print(f"Gemini: Could not list available models: {str(e)}")
        
        for model_display_name, model_id in model_attempts:
            if model_id in exclude_models:
                print(f"Gemini: Skipping model {model_display_name} ({model_id}) - already tried")
                continue
            
            # Check if model is in available models list (if we got it)
            if available_models and model_id not in available_models:
                print(f"Gemini: Model {model_display_name} ({model_id}) not in available models list")
                continue
            
            try:
                self.model = self.genai.GenerativeModel(model_id)
                self.model_name = model_id
                print(f"Gemini: Successfully initialized model {model_display_name} ({model_id})")
                return True
            except Exception as e:
                print(f"Gemini: Model {model_display_name} ({model_id}) failed: {str(e)}")
                continue
        
        return False
    
    def _convert_messages_to_gemini_format(self, messages):
        """Convert messages from OpenAI format to Gemini format"""
        if not messages:
            return []
        
        gemini_messages = []
        for msg in messages:
            role = msg.get('role', 'user')
            content = msg.get('content', '')
            
            # Gemini uses 'user' and 'model' roles (not 'assistant')
            if role == 'assistant':
                gemini_role = 'model'
            elif role == 'user':
                gemini_role = 'user'
            else:
                # Skip system messages or convert to user
                gemini_role = 'user'
            
            gemini_messages.append({
                'role': gemini_role,
                'parts': [content]
            })
        
        return gemini_messages
    
    def generate(self, message, temperature=0.7, max_tokens=2000, messages=None, retry_count=0, **kwargs):
        # Ensure model is initialized
        if not self._ensure_model_initialized():
            raise ValueError("Gemini API key not configured or no compatible model available")
        
        # Prevent infinite recursion
        if retry_count > 2:
            raise ValueError("Gemini API: Failed to initialize compatible model after multiple attempts")
        
        try:
            # If we have message history, use ChatSession for proper context
            if messages and len(messages) > 1:
                # Convert messages to Gemini format
                gemini_messages = self._convert_messages_to_gemini_format(messages)
                
                # History is all messages except the last one (which is the current user message)
                history = gemini_messages[:-1] if len(gemini_messages) > 1 else []
                
                # Current user message is the last one
                current_message = gemini_messages[-1] if gemini_messages else None
                user_content = current_message.get('parts', [message])[0] if current_message else message
                
                # Ensure user_content is a string
                if not isinstance(user_content, str):
                    user_content = str(user_content)
                
                # Create a chat session with history
                chat = self.model.start_chat(history=history)
                
                # Generate response with chat context
                response = chat.send_message(
                    user_content,
                    generation_config={
                        "temperature": temperature,
                        "max_output_tokens": max_tokens,
                    }
                )
            else:
                # Single message, no history
                response = self.model.generate_content(
                    message,
                    generation_config={
                        "temperature": temperature,
                        "max_output_tokens": max_tokens,
                    }
                )
            
            # Handle response
            if hasattr(response, 'text'):
                return response.text
            elif hasattr(response, 'candidates') and response.candidates:
                candidate = response.candidates[0]
                if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                    return ''.join([part.text for part in candidate.content.parts if hasattr(part, 'text')])
                return str(candidate)
            else:
                return str(response)
                
        except Exception as e:
            error_msg = str(e)
            # If model not found (404) or not supported, try to reinitialize with fallback
            if ("404" in error_msg and "not found" in error_msg.lower()) or \
               ("not supported" in error_msg.lower() and "generateContent" in error_msg):
                print(f"Gemini: Model {self.model_name} not available or not supported, trying fallback...")
                # Reset model and try to initialize with fallback
                old_model_name = self.model_name
                self.model = None
                self.model_name = None
                # Exclude the failed model from retry attempts
                if self._ensure_model_initialized(exclude_models=[old_model_name]):
                    if self.model_name and self.model_name != old_model_name:
                        # Retry with new model
                        try:
                            return self.generate(message, temperature, max_tokens, messages, retry_count=retry_count+1, **kwargs)
                        except Exception as retry_e:
                            error_msg = str(retry_e)
                    else:
                        error_msg = f"Gemini API: Failed to initialize fallback model. Tried: {old_model_name}"
                else:
                    error_msg = f"Gemini API: No compatible model available. Tried: {old_model_name}"
            
            # Provide more helpful error messages
            if "API_KEY" in error_msg or "api key" in error_msg.lower():
                raise ValueError("Gemini API key not configured or invalid")
            elif "quota" in error_msg.lower() or "limit" in error_msg.lower():
                raise ValueError("Gemini API quota exceeded. Please check your usage limits.")
            else:
                raise ValueError(f"Gemini API error: {error_msg}")
    
    def stream(self, message, temperature=0.7, max_tokens=2000, messages=None, retry_count=0, **kwargs):
        # Ensure model is initialized
        if not self._ensure_model_initialized():
            raise ValueError("Gemini API key not configured or no compatible model available")
        
        # Prevent infinite recursion
        if retry_count > 2:
            raise ValueError("Gemini API: Failed to initialize compatible model after multiple attempts")
        
        try:
            # If we have message history, use ChatSession for proper context
            if messages and len(messages) > 1:
                # Convert messages to Gemini format
                gemini_messages = self._convert_messages_to_gemini_format(messages)
                
                # History is all messages except the last one (which is the current user message)
                history = gemini_messages[:-1] if len(gemini_messages) > 1 else []
                
                # Current user message is the last one
                current_message = gemini_messages[-1] if gemini_messages else None
                user_content = current_message.get('parts', [message])[0] if current_message else message
                
                # Ensure user_content is a string
                if not isinstance(user_content, str):
                    user_content = str(user_content)
                
                # Create a chat session with history
                chat = self.model.start_chat(history=history)
                
                # Stream response with chat context
                response = chat.send_message(
                    user_content,
                    generation_config={
                        "temperature": temperature,
                        "max_output_tokens": max_tokens,
                    },
                    stream=True
                )
            else:
                # Single message, no history
                response = self.model.generate_content(
                    message,
                    generation_config={
                        "temperature": temperature,
                        "max_output_tokens": max_tokens,
                    },
                    stream=True
                )
            
            # Stream chunks
            for chunk in response:
                if hasattr(chunk, 'text') and chunk.text:
                    yield chunk.text
                elif hasattr(chunk, 'candidates') and chunk.candidates:
                    candidate = chunk.candidates[0]
                    if hasattr(candidate, 'content') and hasattr(candidate.content, 'parts'):
                        for part in candidate.content.parts:
                            if hasattr(part, 'text') and part.text:
                                yield part.text
                
        except Exception as e:
            error_msg = str(e)
            # If model not found (404) or not supported, try to reinitialize with fallback
            if ("404" in error_msg and "not found" in error_msg.lower()) or \
               ("not supported" in error_msg.lower() and "generateContent" in error_msg):
                print(f"Gemini: Model {self.model_name} not available or not supported, trying fallback...")
                # Reset model and try to initialize with fallback
                old_model_name = self.model_name
                self.model = None
                self.model_name = None
                # Exclude the failed model from retry attempts
                if self._ensure_model_initialized(exclude_models=[old_model_name]):
                    if self.model_name and self.model_name != old_model_name:
                        # Retry with new model
                        try:
                            for chunk in self.stream(message, temperature, max_tokens, messages, retry_count=retry_count+1, **kwargs):
                                yield chunk
                            return
                        except Exception as retry_e:
                            error_msg = str(retry_e)
                    else:
                        error_msg = f"Gemini API: Failed to initialize fallback model. Tried: {old_model_name}"
                else:
                    error_msg = f"Gemini API: No compatible model available. Tried: {old_model_name}"
            
            # Provide more helpful error messages
            if "API_KEY" in error_msg or "api key" in error_msg.lower():
                raise ValueError("Gemini API key not configured or invalid")
            elif "quota" in error_msg.lower() or "limit" in error_msg.lower():
                raise ValueError("Gemini API quota exceeded. Please check your usage limits.")
            else:
                raise ValueError(f"Gemini API error: {error_msg}")


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
            if chunk.choices and len(chunk.choices) > 0:
                delta = chunk.choices[0].delta
                if delta and hasattr(delta, 'content') and delta.content:
                    yield delta.content


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
    """Get existing chat or create new one for user. Returns chat_id (int)."""
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
            chat.updated_at = datetime.now(timezone.utc)
            db.commit()
        
        # Сохраняем chat_id до закрытия сессии, чтобы избежать DetachedInstanceError
        chat_id = chat.id
        return chat_id
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
        chat_id = None
        messages_history = []
        if user_id:
            chat_id = get_or_create_chat(user_id, user_name, username, provider_name)
            # Load chat history
            history = get_chat_history(chat_id)
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
        if chat_id and user_id:
            save_message(chat_id, "user", message, provider_name, temperature, max_tokens)
            save_message(chat_id, "assistant", response, provider_name, temperature, max_tokens)
        
        return jsonify({
            'success': True,
            'data': {
                'response': response,
                'provider': provider_name,
                'chat_id': chat_id
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
        chat_id = None
        messages_history = []
        if user_id:
            chat_id = get_or_create_chat(user_id, user_name, username, provider_name)
            # Load chat history
            history = get_chat_history(chat_id)
            # Convert to format expected by providers
            messages_history = [
                {"role": msg['role'], "content": msg['content']}
                for msg in history
            ]
        
        # Add current user message to history
        messages_history.append({"role": "user", "content": message})
        
        # Save user message to database
        if chat_id and user_id:
            try:
                save_message(chat_id, "user", message, provider_name, temperature, max_tokens)
            except Exception as db_error:
                print(f"WARNING: Failed to save user message to database: {str(db_error)}")
                # Продолжаем выполнение даже если сохранение не удалось
        
        def generate():
            full_response = ""
            try:
                for chunk in provider.stream(
                    message,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    messages=messages_history if messages_history else None
                ):
                    if chunk:  # Проверяем, что chunk не пустой
                        full_response += chunk
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Save assistant response to database
                if chat_id and user_id and full_response:
                    try:
                        save_message(chat_id, "assistant", full_response, provider_name, temperature, max_tokens)
                    except Exception as db_error:
                        print(f"WARNING: Failed to save message to database: {str(db_error)}")
                
                yield "data: [DONE]\n\n"
            except Exception as e:
                # Log the full error for debugging
                error_msg = str(e)
                error_type = type(e).__name__
                print(f"ERROR: Stream generation failed - {error_type}: {error_msg}")
                import traceback
                traceback.print_exc()
                yield f"data: {json.dumps({'error': error_msg, 'type': error_type})}\n\n"
                yield "data: [DONE]\n\n"
        
        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no'
            }
        )
    
    except ValueError as e:
        print(f"ERROR: ValueError in chat_stream - {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 400
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        print(f"ERROR: Exception in chat_stream - {error_type}: {error_msg}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'success': False,
            'error': error_msg,
            'type': error_type
        }), 500


def process_file(file):
    """Process uploaded file and return content description"""
    try:
        filename = secure_filename(file.filename)
        content_type = file.content_type or ''
        file_extension = filename.lower().split('.')[-1] if '.' in filename else ''
        
        # Read file data once (file.read() moves the file pointer)
        file.seek(0)  # Reset file pointer to beginning
        file_data = file.read()
        
        # Сохраняем файл в хранилище (если настроено)
        storage_info = None
        if storage.enabled:
            storage_info = storage.upload_file(
                file_data=file_data,
                filename=filename,
                content_type=content_type,
                folder='chat-files'
            )
        
        # Process images
        if content_type.startswith('image/'):
            file_base64 = base64.b64encode(file_data).decode('utf-8')
            
            # Try to extract image metadata using Pillow
            image_info = f'Изображение: {filename}'
            try:
                from PIL import Image
                img = Image.open(io.BytesIO(file_data))
                width, height = img.size
                image_info += f' ({width}x{height}px)'
            except Exception:
                pass
            
            result = {
                'type': 'image',
                'filename': filename,
                'content_type': content_type,
                'base64': file_base64,
                'description': image_info
            }
            
            # Добавляем информацию о хранилище, если файл был сохранен
            if storage_info:
                result['storage'] = storage_info
                result['description'] += f'\nФайл сохранен в облаке: {storage_info["url"]}'
            
            return result
        
        # Process PDF files
        elif content_type == 'application/pdf' or file_extension == 'pdf':
            try:
                import pdfplumber
                
                # Extract text from PDF
                text_parts = []
                with pdfplumber.open(io.BytesIO(file_data)) as pdf:
                    for i, page in enumerate(pdf.pages[:10]):  # Limit to first 10 pages
                        text = page.extract_text()
                        if text:
                            text_parts.append(f'Страница {i+1}:\n{text}')
                
                if text_parts:
                    full_text = '\n\n'.join(text_parts)
                    # Limit text length
                    if len(full_text) > 5000:
                        full_text = full_text[:5000] + '\n\n[... текст обрезан ...]'
                    result = {
                        'type': 'pdf',
                        'filename': filename,
                        'content': full_text,
                        'description': f'PDF файл {filename}:\n{full_text}'
                    }
                    
                    # Добавляем информацию о хранилище, если файл был сохранен
                    if storage_info:
                        result['storage'] = storage_info
                        result['description'] += f'\n\nФайл сохранен в облаке: {storage_info["url"]}'
                    
                    return result
                else:
                    result = {
                        'type': 'pdf',
                        'filename': filename,
                        'description': f'PDF файл: {filename} (не удалось извлечь текст, возможно это сканированное изображение)'
                    }
                    if storage_info:
                        result['storage'] = storage_info
                        result['description'] += f'\n\nФайл сохранен в облаке: {storage_info["url"]}'
                    return result
            except ImportError:
                return {
                    'type': 'pdf',
                    'filename': filename,
                    'description': f'PDF файл: {filename} (библиотека pdfplumber не установлена)'
                }
            except Exception as e:
                return {
                    'type': 'pdf',
                    'filename': filename,
                    'description': f'PDF файл: {filename} (ошибка обработки: {str(e)})'
                }
        
        # Process Word documents (.docx)
        elif content_type == 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' or file_extension == 'docx':
            try:
                import docx
                
                # Extract text from Word document
                doc = docx.Document(io.BytesIO(file_data))
                paragraphs = []
                for para in doc.paragraphs:
                    if para.text.strip():
                        paragraphs.append(para.text)
                
                full_text = '\n'.join(paragraphs)
                
                # Also extract text from tables
                for table in doc.tables:
                    table_text = []
                    for row in table.rows:
                        row_text = ' | '.join([cell.text.strip() for cell in row.cells])
                        table_text.append(row_text)
                    if table_text:
                        full_text += '\n\nТаблица:\n' + '\n'.join(table_text)
                
                if full_text:
                    if len(full_text) > 5000:
                        full_text = full_text[:5000] + '\n\n[... текст обрезан ...]'
                    result = {
                        'type': 'docx',
                        'filename': filename,
                        'content': full_text,
                        'description': f'Word документ {filename}:\n{full_text}'
                    }
                    
                    # Добавляем информацию о хранилище, если файл был сохранен
                    if storage_info:
                        result['storage'] = storage_info
                        result['description'] += f'\n\nФайл сохранен в облаке: {storage_info["url"]}'
                    
                    return result
                else:
                    result = {
                        'type': 'docx',
                        'filename': filename,
                        'description': f'Word документ: {filename} (документ пуст)'
                    }
                    if storage_info:
                        result['storage'] = storage_info
                        result['description'] += f'\n\nФайл сохранен в облаке: {storage_info["url"]}'
                    return result
            except ImportError:
                return {
                    'type': 'docx',
                    'filename': filename,
                    'description': f'Word документ: {filename} (библиотека python-docx не установлена)'
                }
            except Exception as e:
                return {
                    'type': 'docx',
                    'filename': filename,
                    'description': f'Word документ: {filename} (ошибка обработки: {str(e)})'
                }
        
        # Process Excel files (.xlsx)
        elif content_type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' or file_extension in ('xlsx', 'xls'):
            try:
                import openpyxl
                
                # Extract data from Excel
                workbook = openpyxl.load_workbook(io.BytesIO(file_data), data_only=True)
                excel_text = []
                
                for sheet_name in workbook.sheetnames[:3]:  # Limit to first 3 sheets
                    sheet = workbook[sheet_name]
                    excel_text.append(f'\nЛист "{sheet_name}":')
                    
                    for row_idx, row in enumerate(sheet.iter_rows(values_only=True), 1):
                        if row_idx > 50:  # Limit rows per sheet
                            excel_text.append('[... строки пропущены ...]')
                            break
                        row_data = [str(cell) if cell is not None else '' for cell in row]
                        if any(row_data):  # Skip empty rows
                            excel_text.append(' | '.join(row_data))
                
                full_text = '\n'.join(excel_text)
                if len(full_text) > 5000:
                    full_text = full_text[:5000] + '\n\n[... данные обрезаны ...]'
                
                result = {
                    'type': 'excel',
                    'filename': filename,
                    'content': full_text,
                    'description': f'Excel файл {filename}:\n{full_text}'
                }
                
                # Добавляем информацию о хранилище, если файл был сохранен
                if storage_info:
                    result['storage'] = storage_info
                    result['description'] += f'\n\nФайл сохранен в облаке: {storage_info["url"]}'
                
                return result
            except ImportError:
                return {
                    'type': 'excel',
                    'filename': filename,
                    'description': f'Excel файл: {filename} (библиотека openpyxl не установлена)'
                }
            except Exception as e:
                return {
                    'type': 'excel',
                    'filename': filename,
                    'description': f'Excel файл: {filename} (ошибка обработки: {str(e)})'
                }
        
        # Process text files
        elif content_type.startswith('text/') or file_extension in ('txt', 'md', 'py', 'js', 'html', 'css', 'json', 'xml', 'csv', 'log', 'yaml', 'yml'):
            try:
                text_content = file_data.decode('utf-8')
            except UnicodeDecodeError:
                try:
                    text_content = file_data.decode('latin-1')
                except:
                    text_content = f'[Не удалось прочитать содержимое файла {filename}]'
            
            # Limit text length
            if len(text_content) > 5000:
                text_content = text_content[:5000] + '\n\n[... текст обрезан ...]'
            
            result = {
                'type': 'text',
                'filename': filename,
                'content': text_content,
                'description': f'Текстовый файл {filename}:\n{text_content}'
            }
            
            # Добавляем информацию о хранилище, если файл был сохранен
            if storage_info:
                result['storage'] = storage_info
                result['description'] += f'\n\nФайл сохранен в облаке: {storage_info["url"]}'
            
            return result
        
        # Other file types
        else:
            result = {
                'type': 'other',
                'filename': filename,
                'content_type': content_type,
                'description': f'Файл: {filename} (тип: {content_type}) - содержимое не может быть обработано автоматически'
            }
            if storage_info:
                result['storage'] = storage_info
                result['description'] += f'\n\nФайл сохранен в облаке: {storage_info["url"]}'
            return result
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        return {
            'type': 'error',
            'filename': file.filename if hasattr(file, 'filename') else 'unknown',
            'error': str(e),
            'description': f'Ошибка обработки файла {file.filename if hasattr(file, "filename") else "unknown"}: {str(e)}'
        }


@app.route('/api/chat/with-files', methods=['POST'])
@app.route('/chat/with-files', methods=['POST'])
def chat_with_files():
    """Chat endpoint with file upload support"""
    try:
        # Get form data
        message = request.form.get('message', '')
        provider_name = request.form.get('provider', 'openai')
        
        try:
            temperature = float(request.form.get('temperature', 0.7))
        except (ValueError, TypeError):
            temperature = 0.7
        
        try:
            max_tokens = int(request.form.get('maxTokens', 2000))
        except (ValueError, TypeError):
            max_tokens = 2000
        
        # Get user info
        user_id = request.form.get('user_id')
        user_name = request.form.get('user_first_name')
        username = request.form.get('user_username')
        
        # Process uploaded files
        file_descriptions = []
        file_keys = [key for key in request.files.keys() if key.startswith('file_')]
        file_keys.sort()  # Sort to maintain order
        
        for file_key in file_keys:
            file = request.files[file_key]
            if file and file.filename:
                file_info = process_file(file)
                file_descriptions.append(file_info['description'])
        
        # Combine message with file descriptions
        if file_descriptions:
            files_text = '\n\nПрикрепленные файлы:\n' + '\n'.join([f'- {desc}' for desc in file_descriptions])
            full_message = message + files_text if message else files_text
        else:
            full_message = message
        
        if not full_message.strip():
            return jsonify({
                'success': False,
                'error': 'Message or files are required'
            }), 400
        
        # Get or create chat session
        chat_id = None
        messages_history = []
        if user_id:
            chat_id = get_or_create_chat(user_id, user_name, username, provider_name)
            # Load chat history
            history = get_chat_history(chat_id)
            # Convert to format expected by providers
            messages_history = [
                {"role": msg['role'], "content": msg['content']}
                for msg in history
            ]
        
        provider = get_provider(provider_name)
        
        # Add current user message to history
        messages_history.append({"role": "user", "content": full_message})
        
        # Save user message to database
        if chat_id and user_id:
            try:
                save_message(chat_id, "user", full_message, provider_name, temperature, max_tokens)
            except Exception as db_error:
                print(f"WARNING: Failed to save user message to database: {str(db_error)}")
        
        def generate():
            full_response = ""
            try:
                for chunk in provider.stream(
                    full_message,
                    temperature=temperature,
                    max_tokens=max_tokens,
                    messages=messages_history if messages_history else None
                ):
                    if chunk:
                        full_response += chunk
                        yield f"data: {json.dumps({'content': chunk})}\n\n"
                
                # Save assistant response to database
                if chat_id and user_id and full_response:
                    try:
                        save_message(chat_id, "assistant", full_response, provider_name, temperature, max_tokens)
                    except Exception as db_error:
                        print(f"WARNING: Failed to save message to database: {str(db_error)}")
                
                yield "data: [DONE]\n\n"
            except Exception as e:
                error_msg = str(e)
                error_type = type(e).__name__
                print(f"ERROR: Stream generation failed - {error_type}: {error_msg}")
                import traceback
                traceback.print_exc()
                yield f"data: {json.dumps({'error': error_msg, 'type': error_type})}\n\n"
                yield "data: [DONE]\n\n"
        
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
        import traceback
        traceback.print_exc()
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