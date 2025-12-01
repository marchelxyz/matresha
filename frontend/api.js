// API Service for AI Assistant
class AIAPI {
    constructor() {
        // Use environment variable or default to relative path
        this.baseURL = window.API_BASE_URL || '/api';
        this.timeout = 60000; // 60 seconds for AI responses
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
            },
            timeout: this.timeout,
            ...options
        };

        if (options.body && typeof options.body === 'object') {
            config.body = JSON.stringify(options.body);
        }

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }

    // Stream message (for streaming responses)
    async streamMessage(message, provider, options = {}) {
        const url = `${this.baseURL}/chat/stream`;
        
        // Подготовка данных для отправки - фильтруем undefined значения
        const requestData = {
            message,
            provider,
            ...Object.fromEntries(
                Object.entries(options).filter(([_, v]) => v !== undefined)
            )
        };
        
        const config = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'text/event-stream',
            },
            body: JSON.stringify(requestData)
        };

        try {
            const response = await fetch(url, config);
            
            if (!response.ok) {
                // Попытаться получить детали ошибки от сервера
                let errorMessage = `HTTP error! status: ${response.status}`;
                try {
                    // Клонируем ответ, чтобы можно было прочитать его несколько раз
                    const responseClone = response.clone();
                    const contentType = response.headers.get('content-type');
                    
                    if (contentType && contentType.includes('application/json')) {
                        const errorData = await responseClone.json();
                        if (errorData.error) {
                            errorMessage = errorData.error;
                        } else if (errorData.message) {
                            errorMessage = errorData.message;
                        }
                    } else {
                        const errorText = await responseClone.text();
                        if (errorText && errorText.trim()) {
                            errorMessage = errorText;
                        }
                    }
                } catch (e) {
                    // Если не удалось прочитать тело ответа, используем статус код
                    console.warn('Could not read error response body:', e);
                }
                throw new Error(errorMessage);
            }
            
            return response;
        } catch (error) {
            console.error('Stream request failed:', error);
            throw error;
        }
    }

    // Send message (non-streaming)
    async sendMessage(message, provider, options = {}) {
        return this.request('/chat', {
            method: 'POST',
            body: {
                message,
                provider,
                ...options
            }
        });
    }

    // Get available providers
    async getProviders() {
        return this.request('/providers');
    }

    // Health check
    async healthCheck() {
        return this.request('/health');
    }
}

// Mock API for development
class MockAIAPI extends AIAPI {
    constructor() {
        super();
        this.baseURL = 'mock://api';
    }

    async request(endpoint, options = {}) {
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        // Return mock data based on endpoint
        return this.getMockResponse(endpoint, options);
    }

    async streamMessage(message, provider, options = {}) {
        // Simulate streaming with delay
        return this.simulateStream(message, provider);
    }

    async simulateStream(message, provider) {
        const responses = {
            openai: `Я - GPT-4 от OpenAI. Вы спросили: "${message}"\n\nЭто демонстрационный ответ. Для работы с реальным API необходимо настроить ключ API на сервере.`,
            gemini: `Я - Gemini Pro от Google. Вы спросили: "${message}"\n\nЭто демонстрационный ответ. Для работы с реальным API необходимо настроить ключ API на сервере.`,
            claude: `Я - Claude 3 от Anthropic. Вы спросили: "${message}"\n\nЭто демонстрационный ответ. Для работы с реальным API необходимо настроить ключ API на сервере.`,
            groq: `Я - Llama 3 от Groq. Вы спросили: "${message}"\n\nЭто демонстрационный ответ. Для работы с реальным API необходимо настроить ключ API на сервере.`,
            mistral: `Я - Mistral Large. Вы спросили: "${message}"\n\nЭто демонстрационный ответ. Для работы с реальным API необходимо настроить ключ API на сервере.`
        };

        const responseText = responses[provider] || responses.openai;
        
        // Create a mock ReadableStream
        const encoder = new TextEncoder();
        const stream = new ReadableStream({
            async start(controller) {
                const words = responseText.split(' ');
                for (let i = 0; i < words.length; i++) {
                    const chunk = `data: ${JSON.stringify({ content: words[i] + (i < words.length - 1 ? ' ' : '') })}\n\n`;
                    controller.enqueue(encoder.encode(chunk));
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
            }
        });

        return {
            ok: true,
            status: 200,
            body: stream,
            bodyUsed: false
        };
    }

    getMockResponse(endpoint, options) {
        const mockResponses = {
            '/chat': {
                success: true,
                data: {
                    response: 'Это демонстрационный ответ AI-ассистента. В реальном приложении здесь будет интеллектуальный ответ на основе вашего запроса.',
                    provider: options.body?.provider || 'openai'
                }
            },
            '/providers': {
                success: true,
                data: {
                    providers: ['openai', 'gemini', 'claude', 'groq', 'mistral']
                }
            },
            '/health': {
                status: 'ok',
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };

        return mockResponses[endpoint] || {
            success: false,
            error: 'Endpoint not found'
        };
    }
}

// Initialize API instance
// Try to detect if we're in a real environment
let api;

// Check if API_BASE_URL is explicitly set (production)
if (window.API_BASE_URL && window.API_BASE_URL !== '/api' && !window.API_BASE_URL.includes('localhost')) {
    // Production mode with explicit API URL - use real API
    api = new AIAPI();
    console.log('Using real API:', window.API_BASE_URL);
} else if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    // Development mode - use mock API
    api = new MockAIAPI();
    console.log('Using mock API (development mode)');
} else {
    // Production mode - try real API first
    api = new AIAPI();
    console.log('Using real API (production mode, default /api)');
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AIAPI, MockAIAPI, api };
} else {
    window.AIAPI = AIAPI;
    window.MockAIAPI = MockAIAPI;
    window.api = api;
}