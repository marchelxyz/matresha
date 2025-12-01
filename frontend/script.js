// Telegram Web App initialization
const tg = window.Telegram.WebApp;

// DOM elements
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const charCount = document.getElementById('charCount');
const aiProvider = document.getElementById('aiProvider');
const modelInfo = document.getElementById('modelInfo');
const settingsBtn = document.getElementById('settingsBtn');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const settingsProvider = document.getElementById('settingsProvider');
const temperature = document.getElementById('temperature');
const temperatureValue = document.getElementById('temperatureValue');
const maxTokens = document.getElementById('maxTokens');

// State
let isProcessing = false;
let currentProvider = 'openai';
let currentSettings = {
    temperature: 0.7,
    maxTokens: 2000
};
let markdownParser = null;

// Provider configurations
const providers = {
    openai: { name: 'GPT-4', model: 'gpt-4-turbo-preview' },
    gemini: { name: 'Gemini Pro', model: 'gemini-pro' },
    claude: { name: 'Claude 3', model: 'claude-3-opus-20240229' },
    groq: { name: 'Llama 3', model: 'llama-3-70b-8192' },
    mistral: { name: 'Mistral Large', model: 'mistral-large-latest' }
};

// Initialize the app
function initApp() {
    // Initialize markdown parser
    markdownParser = new MarkdownParser();
    
    // Configure Telegram Web App
    tg.ready();
    tg.expand();
    
    // Set theme
    document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
    document.body.style.color = tg.themeParams.text_color || '#212121';
    
    // Load settings from localStorage
    loadSettings();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update UI
    updateProviderInfo();
}

// Setup event listeners
function setupEventListeners() {
    // Message input
    messageInput.addEventListener('input', handleInputChange);
    messageInput.addEventListener('keydown', handleKeyDown);
    
    // Send button
    sendButton.addEventListener('click', sendMessage);
    
    // Auto-resize textarea
    messageInput.addEventListener('input', autoResizeTextarea);
    
    // Provider selector
    aiProvider.addEventListener('change', handleProviderChange);
    
    // Settings
    settingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('show');
        loadSettingsToModal();
    });
    
    closeSettings.addEventListener('click', () => {
        settingsModal.classList.remove('show');
    });
    
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.classList.remove('show');
        }
    });
    
    settingsProvider.addEventListener('change', handleProviderChange);
    
    temperature.addEventListener('input', (e) => {
        temperatureValue.textContent = e.target.value;
        currentSettings.temperature = parseFloat(e.target.value);
        saveSettings();
    });
    
    maxTokens.addEventListener('change', (e) => {
        currentSettings.maxTokens = parseInt(e.target.value);
        saveSettings();
    });
}

// Handle provider change
function handleProviderChange() {
    const provider = aiProvider.value || settingsProvider.value;
    currentProvider = provider;
    updateProviderInfo();
    saveSettings();
}

// Update provider info
function updateProviderInfo() {
    const provider = providers[currentProvider];
    if (provider) {
        modelInfo.textContent = provider.name;
        if (settingsProvider) {
            settingsProvider.value = currentProvider;
        }
    }
}

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('aiAssistantSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            currentProvider = settings.provider || 'openai';
            currentSettings.temperature = settings.temperature || 0.7;
            currentSettings.maxTokens = settings.maxTokens || 2000;
            aiProvider.value = currentProvider;
            updateProviderInfo();
        } catch (e) {
            console.error('Failed to load settings:', e);
        }
    }
}

// Save settings to localStorage
function saveSettings() {
    const settings = {
        provider: currentProvider,
        temperature: currentSettings.temperature,
        maxTokens: currentSettings.maxTokens
    };
    localStorage.setItem('aiAssistantSettings', JSON.stringify(settings));
}

// Load settings to modal
function loadSettingsToModal() {
    settingsProvider.value = currentProvider;
    temperature.value = currentSettings.temperature;
    temperatureValue.textContent = currentSettings.temperature;
    maxTokens.value = currentSettings.maxTokens;
}

// Handle input changes
function handleInputChange() {
    const text = messageInput.value;
    charCount.textContent = `${text.length}/4000`;
    
    // Enable/disable send button
    sendButton.disabled = text.trim().length === 0 || isProcessing;
}

// Handle key down events
function handleKeyDown(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
    }
}

// Auto-resize textarea
function autoResizeTextarea() {
    messageInput.style.height = 'auto';
    messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

// Send message
async function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || isProcessing) return;
    
    // Add user message
    addMessage(text, 'user');
    
    // Clear input
    messageInput.value = '';
    autoResizeTextarea();
    handleInputChange();
    
    // Set processing state
    isProcessing = true;
    sendButton.disabled = true;
    
    // Create bot message container for streaming
    const botMessageDiv = createBotMessageContainer();
    
    try {
        // Try to use API with streaming
        await streamAIResponse(text, botMessageDiv);
    } catch (error) {
        console.error('Error:', error);
        updateBotMessage(botMessageDiv, 'Извините, произошла ошибка. Попробуйте еще раз.');
    } finally {
        isProcessing = false;
        sendButton.disabled = messageInput.value.trim().length === 0;
    }
}

// Create bot message container
function createBotMessageContainer() {
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message bot-message';
    
    const avatarDiv = document.createElement('div');
    avatarDiv.className = 'message-avatar';
    avatarDiv.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
        </svg>
    `;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.innerHTML = '<div class="typing-indicator"><span></span><span></span><span></span></div>';
    
    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    return { messageDiv, textDiv };
}

// Update bot message (for streaming)
function updateBotMessage({ textDiv }, text) {
    if (markdownParser) {
        textDiv.innerHTML = markdownParser.parse(text);
    } else {
        textDiv.textContent = text;
    }
    scrollToBottom();
}

// Stream AI response
async function streamAIResponse(userMessage, botMessageContainer) {
    try {
        // Try to use real API
        const response = await api.streamMessage(
            userMessage,
            currentProvider,
            {
                temperature: currentSettings.temperature,
                maxTokens: currentSettings.maxTokens,
                user: tg.initDataUnsafe?.user
            }
        );
        
        let fullText = '';
        
        // Handle streaming response
        if (response.body && typeof response.body.getReader === 'function') {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            if (json.content) {
                                fullText += json.content;
                                updateBotMessage(botMessageContainer, fullText);
                            }
                        } catch (e) {
                            // Not JSON, might be plain text
                            if (data.trim()) {
                                fullText += data;
                                updateBotMessage(botMessageContainer, fullText);
                            }
                        }
                    } else if (line.trim()) {
                        // Plain text chunk
                        fullText += line;
                        updateBotMessage(botMessageContainer, fullText);
                    }
                }
            }
        } else {
            // Fallback to non-streaming
            const result = await api.sendMessage(
                userMessage,
                currentProvider,
                {
                    temperature: currentSettings.temperature,
                    maxTokens: currentSettings.maxTokens,
                    user: tg.initDataUnsafe?.user
                }
            );
            
            if (result.success && result.data.response) {
                updateBotMessage(botMessageContainer, result.data.response);
            } else {
                throw new Error('Invalid response');
            }
        }
    } catch (error) {
        console.error('API error:', error);
        
        // Show actual error message instead of fallback
        const errorMessage = error.message || 'Неизвестная ошибка';
        const isNetworkError = errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError');
        const isConfigError = errorMessage.includes('API key not configured');
        
        let userFriendlyError = '';
        if (isNetworkError) {
            userFriendlyError = `❌ Ошибка подключения к серверу.\n\nПроверьте:\n• Правильно ли настроен API_BASE_URL в telegram-config.js\n• Доступен ли backend сервер\n• Нет ли проблем с сетью\n\nТехническая ошибка: ${errorMessage}`;
        } else if (isConfigError) {
            userFriendlyError = `❌ API ключ не настроен.\n\nДля использования ${providers[currentProvider]?.name || currentProvider} необходимо:\n• Добавить ${currentProvider.toUpperCase()}_API_KEY в переменные окружения Railway\n• Перезапустить сервер после добавления ключа\n\nТехническая ошибка: ${errorMessage}`;
        } else {
            userFriendlyError = `❌ Произошла ошибка при обращении к API.\n\nОшибка: ${errorMessage}\n\nПроверьте логи сервера для получения дополнительной информации.`;
        }
        
        updateBotMessage(botMessageContainer, userFriendlyError);
    }
}

// Simulate streaming response (for demo/fallback)
async function simulateStreamingResponse(userMessage, botMessageContainer) {
    const responses = {
        openai: `Я - GPT-4 от OpenAI. Вы спросили: "${userMessage}"\n\nЭто демонстрационный ответ. Для работы с реальным API OpenAI необходимо настроить ключ API на сервере.\n\n**Возможности GPT-4:**\n• Понимание контекста\n• Креативные решения\n• Анализ данных\n• Многоязычная поддержка`,
        gemini: `Я - Gemini Pro от Google. Вы спросили: "${userMessage}"\n\nЭто демонстрационный ответ. Для работы с реальным API Gemini необходимо настроить ключ API на сервере.\n\n**Возможности Gemini:**\n• Мультимодальность\n• Быстрые ответы\n• Понимание изображений\n• Интеграция с Google сервисами`,
        claude: `Я - Claude 3 от Anthropic. Вы спросили: "${userMessage}"\n\nЭто демонстрационный ответ. Для работы с реальным API Claude необходимо настроить ключ API на сервере.\n\n**Возможности Claude:**\n• Работа с длинными текстами\n• Безопасность и этика\n• Точный анализ\n• Контекстное понимание`,
        groq: `Я - Llama 3 от Groq. Вы спросили: "${userMessage}"\n\nЭто демонстрационный ответ. Для работы с реальным API Groq необходимо настроить ключ API на сервере.\n\n**Возможности Llama 3:**\n• Очень быстрые ответы\n• Эффективность\n• Открытая модель\n• Низкая задержка`,
        mistral: `Я - Mistral Large. Вы спросили: "${userMessage}"\n\nЭто демонстрационный ответ. Для работы с реальным API Mistral необходимо настроить ключ API на сервере.\n\n**Возможности Mistral:**\n• Многоязычность\n• Эффективность\n• Качественные ответы\n• Европейская разработка`
    };
    
    const responseText = responses[currentProvider] || responses.openai;
    const words = responseText.split(' ');
    let currentText = '';
    
    for (let i = 0; i < words.length; i++) {
        currentText += (i > 0 ? ' ' : '') + words[i];
        updateBotMessage(botMessageContainer, currentText);
        await new Promise(resolve => setTimeout(resolve, 30));
    }
}

// Add message to chat (for user messages)
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    if (sender === 'user') {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        const user = tg.initDataUnsafe?.user;
        avatarDiv.textContent = user?.first_name?.[0] || 'U';
        messageDiv.appendChild(avatarDiv);
    } else {
        const avatarDiv = document.createElement('div');
        avatarDiv.className = 'message-avatar';
        avatarDiv.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
            </svg>
        `;
        messageDiv.appendChild(avatarDiv);
    }
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    textDiv.textContent = text;
    
    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    scrollToBottom();
}

// Scroll to bottom
function scrollToBottom() {
    requestAnimationFrame(() => {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    });
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);