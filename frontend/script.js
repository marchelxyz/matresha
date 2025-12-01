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
const scrollToBottomBtn = document.getElementById('scrollToBottomBtn');
const fileInput = document.getElementById('fileInput');
const fileButton = document.getElementById('fileButton');
const attachedFiles = document.getElementById('attachedFiles');

// State
let isProcessing = false;
let currentProvider = 'openai';
let currentSettings = {
    temperature: 0.7,
    maxTokens: 2000
};
let markdownParser = null;
let selectedFiles = []; // Массив выбранных файлов

// Provider configurations
const providers = {
    openai: { name: 'GPT-4', model: 'gpt-4o' },
    gemini: { name: 'Gemini 1.5', model: 'gemini-1.5-flash' },
    claude: { name: 'Claude 3', model: 'claude-3-opus-20240229' },
    groq: { name: 'Llama 3.3', model: 'llama-3.3-70b-versatile' },
    mistral: { name: 'Mistral Large', model: 'mistral-large-latest' },
    deepseek: { name: 'DeepSeek Chat', model: 'deepseek-chat' }
};

// Convert hex color to RGB
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

// Calculate brightness of a color (0-255)
function getBrightness(color) {
    const rgb = hexToRgb(color);
    if (!rgb) return 128; // Default to medium brightness
    // Using relative luminance formula
    return (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
}

// Check if theme is dark
function isDarkTheme() {
    // Check Telegram theme
    const themeParams = tg.themeParams;
    if (themeParams.bg_color) {
        const brightness = getBrightness(themeParams.bg_color);
        return brightness < 128; // Dark if brightness < 50%
    }
    
    // Fallback to system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return true;
    }
    
    return false;
}

// Apply adaptive logo color based on theme
function applyAdaptiveLogo() {
    const logo = document.querySelector('.app-logo');
    if (!logo) return;
    
    if (isDarkTheme()) {
        // Dark theme: invert logo to make it light
        logo.style.filter = 'brightness(0) invert(1)';
    } else {
        // Light theme: keep logo dark
        logo.style.filter = 'brightness(0)';
    }
}

// Apply Telegram theme colors
function applyTelegramTheme() {
    const themeParams = tg.themeParams;
    const root = document.documentElement;
    
    // Apply theme colors as CSS variables
    if (themeParams.bg_color) {
        root.style.setProperty('--tg-theme-bg-color', themeParams.bg_color);
    }
    if (themeParams.text_color) {
        root.style.setProperty('--tg-theme-text-color', themeParams.text_color);
    }
    if (themeParams.hint_color) {
        root.style.setProperty('--tg-theme-hint-color', themeParams.hint_color);
    }
    if (themeParams.link_color) {
        root.style.setProperty('--tg-theme-link-color', themeParams.link_color);
    }
    if (themeParams.button_color) {
        root.style.setProperty('--tg-theme-button-color', themeParams.button_color);
    }
    if (themeParams.button_text_color) {
        root.style.setProperty('--tg-theme-button-text-color', themeParams.button_text_color);
    }
    if (themeParams.secondary_bg_color) {
        root.style.setProperty('--tg-theme-secondary-bg-color', themeParams.secondary_bg_color);
    }
    
    // Apply adaptive logo
    applyAdaptiveLogo();
    
    // Listen for theme changes
    tg.onEvent('themeChanged', () => {
        applyTelegramTheme();
        applyAdaptiveLogo();
    });
}

// Initialize the app
async function initApp() {
    // Initialize markdown parser
    markdownParser = new MarkdownParser();
    
    // Configure Telegram Web App
    tg.ready();
    tg.expand();
    
    // Set theme
    document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
    document.body.style.color = tg.themeParams.text_color || '#212121';
    
    // Apply Telegram theme colors to CSS variables for adaptive header
    applyTelegramTheme();
    
    // Apply adaptive logo after a short delay to ensure DOM is ready
    setTimeout(() => {
        applyAdaptiveLogo();
    }, 100);
    
    // Load settings from localStorage
    loadSettings();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update UI
    updateProviderInfo();
    
    // Load chat history
    await loadChatHistory();
    
    // Добавить кнопку копирования в приветственное сообщение
    setTimeout(() => {
        const welcomeMessage = document.querySelector('.welcome-message .message-text');
        if (welcomeMessage) {
            const welcomeContent = welcomeMessage.closest('.message-content');
            if (welcomeContent && !welcomeContent.querySelector('.copy-message-btn')) {
                const copyBtn = createCopyButton(welcomeMessage);
                welcomeContent.appendChild(copyBtn);
            }
        }
    }, 100);
    
    // Финальная прокрутка к последнему сообщению при открытии приложения
    // Используем несколько попыток для надежности
    const finalScrollToBottom = () => {
        if (!chatMessages) return;
        
        // Мгновенная прокрутка
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Повторные попытки
        setTimeout(() => {
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
                updateScrollButtonVisibility();
            }
        }, 100);
        
        setTimeout(() => {
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
                updateScrollButtonVisibility();
            }
        }, 300);
        
        setTimeout(() => {
            if (chatMessages) {
                chatMessages.scrollTop = chatMessages.scrollHeight;
                updateScrollButtonVisibility();
            }
        }, 600);
    };
    
    setTimeout(() => {
        finalScrollToBottom();
    }, 400);
    
    // Проверить видимость кнопки прокрутки после загрузки
    setTimeout(() => {
        updateScrollButtonVisibility();
    }, 200);
    
    // Также проверяем при изменении размера окна
    window.addEventListener('resize', () => {
        setTimeout(() => {
            updateScrollButtonVisibility();
        }, 100);
    });
}

// Setup event listeners
function setupEventListeners() {
    // Message input
    messageInput.addEventListener('input', handleInputChange);
    messageInput.addEventListener('keydown', handleKeyDown);
    
    // Глобальный обработчик клавиатуры для стрелки вниз (работает везде)
    document.addEventListener('keydown', (event) => {
        // Стрелка вниз для прокрутки чата (только если поле ввода не в фокусе)
        if (event.key === 'ArrowDown' && document.activeElement !== messageInput && chatMessages) {
            const scrollBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
            // Если есть что прокручивать (больше 50px от низа)
            if (scrollBottom > 50) {
                event.preventDefault();
                scrollToBottom();
            }
        }
    });
    
    // Send button
    sendButton.addEventListener('click', sendMessage);
    
    // File button
    if (fileButton && fileInput) {
        fileButton.addEventListener('click', () => {
            fileInput.click();
        });
        
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Auto-resize textarea
    messageInput.addEventListener('input', autoResizeTextarea);
    
    // Scroll to bottom button
    if (scrollToBottomBtn) {
        scrollToBottomBtn.addEventListener('click', handleScrollToBottomClick);
    }
    
    // Track scroll position to show/hide scroll button
    if (chatMessages) {
        chatMessages.addEventListener('scroll', updateScrollButtonVisibility);
        // Также проверяем при изменении размера контента
        const resizeObserver = new ResizeObserver(() => {
            updateScrollButtonVisibility();
        });
        resizeObserver.observe(chatMessages);
        
        // Отслеживаем изменения в DOM для появления новых сообщений
        const mutationObserver = new MutationObserver(() => {
            // Небольшая задержка, чтобы DOM успел обновиться
            setTimeout(() => {
                updateScrollButtonVisibility();
            }, 50);
        });
        mutationObserver.observe(chatMessages, {
            childList: true,
            subtree: true
        });
    }
    
    // Provider selector (если существует)
    if (aiProvider) {
        aiProvider.addEventListener('change', handleProviderChange);
    }
    
    // Settings (если существует)
    if (settingsBtn) {
        settingsBtn.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.classList.add('show');
                loadSettingsToModal();
            }
        });
    }
    
    if (closeSettings) {
        closeSettings.addEventListener('click', () => {
            if (settingsModal) {
                settingsModal.classList.remove('show');
            }
        });
    }
    
    if (settingsModal) {
        settingsModal.addEventListener('click', (e) => {
            if (e.target === settingsModal) {
                settingsModal.classList.remove('show');
            }
        });
    }
    
    if (settingsProvider) {
        settingsProvider.addEventListener('change', handleProviderChange);
    }
    
    if (temperature && temperatureValue) {
        temperature.addEventListener('input', (e) => {
            temperatureValue.textContent = e.target.value;
            currentSettings.temperature = parseFloat(e.target.value);
            saveSettings();
        });
    }
    
    if (maxTokens) {
        maxTokens.addEventListener('change', (e) => {
            currentSettings.maxTokens = parseInt(e.target.value);
            saveSettings();
        });
    }
}

// Handle provider change
function handleProviderChange() {
    const provider = (aiProvider && aiProvider.value) || (settingsProvider && settingsProvider.value);
    if (provider) {
        currentProvider = provider;
        updateProviderInfo();
        saveSettings();
    }
}

// Update provider info
function updateProviderInfo() {
    const provider = providers[currentProvider];
    if (provider && modelInfo) {
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
            if (aiProvider) {
                aiProvider.value = currentProvider;
            }
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
    if (settingsProvider) {
        settingsProvider.value = currentProvider;
    }
    if (temperature) {
        temperature.value = currentSettings.temperature;
    }
    if (temperatureValue) {
        temperatureValue.textContent = currentSettings.temperature;
    }
    if (maxTokens) {
        maxTokens.value = currentSettings.maxTokens;
    }
}

// Handle input changes
function handleInputChange() {
    const text = messageInput.value;
    charCount.textContent = `${text.length}/4000`;
    
    // Enable/disable send button (можно отправить если есть текст или файлы)
    sendButton.disabled = (text.trim().length === 0 && selectedFiles.length === 0) || isProcessing;
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

// Handle file selection
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    
    // Проверяем размер файлов (максимум 10MB на файл)
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validFiles = files.filter(file => {
        if (file.size > maxSize) {
            alert(`Файл "${file.name}" слишком большой. Максимальный размер: 10MB`);
            return false;
        }
        return true;
    });
    
    // Добавляем файлы к выбранным
    selectedFiles = [...selectedFiles, ...validFiles];
    
    // Обновляем отображение прикрепленных файлов
    updateAttachedFilesDisplay();
    
    // Очищаем input для возможности повторного выбора того же файла
    event.target.value = '';
}

// Update attached files display
function updateAttachedFilesDisplay() {
    if (!attachedFiles) return;
    
    attachedFiles.innerHTML = '';
    
    if (selectedFiles.length === 0) {
        attachedFiles.style.display = 'none';
        return;
    }
    
    attachedFiles.style.display = 'flex';
    attachedFiles.style.flexWrap = 'wrap';
    attachedFiles.style.gap = '8px';
    attachedFiles.style.marginBottom = '8px';
    
    selectedFiles.forEach((file, index) => {
        const fileTag = document.createElement('div');
        fileTag.className = 'file-tag';
        fileTag.innerHTML = `
            <span class="file-name">${file.name}</span>
            <button type="button" class="file-remove" data-index="${index}" aria-label="Удалить файл">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M19 6.41L17.59 5L12 10.59L6.41 5L5 6.41L10.59 12L5 17.59L6.41 19L12 13.41L17.59 19L19 17.59L13.41 12L19 6.41Z" fill="currentColor"/>
                </svg>
            </button>
        `;
        
        // Обработчик удаления файла
        const removeBtn = fileTag.querySelector('.file-remove');
        removeBtn.addEventListener('click', () => {
            selectedFiles.splice(index, 1);
            updateAttachedFilesDisplay();
        });
        
        attachedFiles.appendChild(fileTag);
    });
}

// Send message
async function sendMessage() {
    const text = messageInput.value.trim();
    const hasFiles = selectedFiles.length > 0;
    
    if ((!text && !hasFiles) || isProcessing) return;
    
    // Add user message
    const messageText = text || (hasFiles ? `Прикреплено файлов: ${selectedFiles.length}` : '');
    addMessage(messageText, 'user');
    
    // Если есть файлы, показываем их в сообщении
    if (hasFiles) {
        selectedFiles.forEach(file => {
            const fileInfo = document.createElement('div');
            fileInfo.className = 'file-info';
            fileInfo.textContent = `📎 ${file.name} (${formatFileSize(file.size)})`;
            // Можно добавить fileInfo в последнее сообщение пользователя
        });
    }
    
    // Clear input and files
    messageInput.value = '';
    autoResizeTextarea();
    handleInputChange();
    
    // Set processing state
    isProcessing = true;
    sendButton.disabled = true;
    
    // Create bot message container for streaming
    const botMessageDiv = createBotMessageContainer();
    
    try {
        // Если есть файлы, загружаем их и отправляем вместе с текстом
        if (hasFiles) {
            await sendMessageWithFiles(text, selectedFiles, botMessageDiv);
            // Очищаем файлы после отправки
            selectedFiles = [];
            updateAttachedFilesDisplay();
        } else {
            // Try to use API with streaming
            await streamAIResponse(text, botMessageDiv);
        }
    } catch (error) {
        console.error('Error:', error);
        updateBotMessage(botMessageDiv, 'Извините, произошла ошибка. Попробуйте еще раз.');
    } finally {
        isProcessing = false;
        sendButton.disabled = messageInput.value.trim().length === 0 && selectedFiles.length === 0;
    }
}

// Format file size
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Send message with files
async function sendMessageWithFiles(text, files, botMessageContainer) {
    try {
        // Загружаем файлы на сервер
        const formData = new FormData();
        formData.append('message', text || '');
        formData.append('provider', currentProvider);
        formData.append('temperature', currentSettings.temperature);
        formData.append('maxTokens', currentSettings.maxTokens);
        
        files.forEach((file, index) => {
            formData.append(`file_${index}`, file);
        });
        
        // Извлекаем данные пользователя
        const userData = tg.initDataUnsafe?.user ? {
            id: tg.initDataUnsafe.user.id,
            first_name: tg.initDataUnsafe.user.first_name,
            username: tg.initDataUnsafe.user.username
        } : undefined;
        
        if (userData) {
            formData.append('user_id', userData.id);
            formData.append('user_first_name', userData.first_name || '');
            formData.append('user_username', userData.username || '');
        }
        
        // Отправляем запрос с файлами
        const response = await fetch(`${api.baseURL}/chat/with-files`, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        // Обрабатываем потоковый ответ
        if (response.body && typeof response.body.getReader === 'function') {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullText = '';
            let buffer = ''; // Буфер для неполных строк
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    // Обрабатываем оставшиеся данные в буфере
                    if (buffer.trim()) {
                        const lines = buffer.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') continue;
                                
                                try {
                                    const json = JSON.parse(data);
                                    if (json.content) {
                                        fullText += json.content;
                                        updateBotMessage(botMessageContainer, fullText);
                                    } else if (json.error) {
                                        // Обрабатываем ошибки от сервера
                                        throw new Error(json.error);
                                    }
                                } catch (e) {
                                    if (e instanceof SyntaxError) {
                                        // Не JSON, может быть plain text
                                        if (data.trim() && data !== '[DONE]') {
                                            fullText += data;
                                            updateBotMessage(botMessageContainer, fullText);
                                        }
                                    } else {
                                        // Другая ошибка (например, от сервера)
                                        throw e;
                                    }
                                }
                            } else if (line.trim()) {
                                // Plain text chunk
                                fullText += line;
                                updateBotMessage(botMessageContainer, fullText);
                            }
                        }
                    }
                    break;
                }
                
                // Декодируем с учетом потока для правильной обработки UTF-8
                buffer += decoder.decode(value, { stream: true });
                
                // Обрабатываем полные строки
                const lines = buffer.split('\n');
                // Последняя строка может быть неполной, оставляем её в буфере
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            if (json.content) {
                                fullText += json.content;
                                updateBotMessage(botMessageContainer, fullText);
                            } else if (json.error) {
                                // Обрабатываем ошибки от сервера
                                throw new Error(json.error);
                            }
                        } catch (e) {
                            if (e instanceof SyntaxError) {
                                // Не JSON, может быть plain text
                                if (data.trim() && data !== '[DONE]') {
                                    fullText += data;
                                    updateBotMessage(botMessageContainer, fullText);
                                }
                            } else {
                                // Другая ошибка (например, от сервера)
                                throw e;
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
            // Fallback для не-потокового ответа
            const result = await response.json();
            if (result.success && result.data.response) {
                updateBotMessage(botMessageContainer, result.data.response);
            } else {
                throw new Error('Invalid response');
            }
        }
    } catch (error) {
        console.error('Error sending message with files:', error);
        throw error;
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
    
    // Добавляем кнопку копирования (будет обновляться при обновлении сообщения)
    const copyBtn = createCopyButton(textDiv);
    contentDiv.appendChild(copyBtn);
    
    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(avatarDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    // Прокручиваем к новому сообщению бота
    scrollToBottom();
    
    return { messageDiv, textDiv, copyBtn };
}

// Update bot message (for streaming)
function updateBotMessage({ textDiv }, text) {
    if (markdownParser) {
        textDiv.innerHTML = markdownParser.parse(text);
    } else {
        textDiv.textContent = text;
    }
    // Прокручиваем только если пользователь уже внизу (во время стриминга)
    scrollToBottom(false, true);
}

// Stream AI response
async function streamAIResponse(userMessage, botMessageContainer) {
    try {
        // Try to use real API
        // Извлекаем только необходимые данные пользователя для отправки
        const userData = tg.initDataUnsafe?.user ? {
            id: tg.initDataUnsafe.user.id,
            first_name: tg.initDataUnsafe.user.first_name,
            username: tg.initDataUnsafe.user.username
        } : undefined;
        
        const response = await api.streamMessage(
            userMessage,
            currentProvider,
            {
                temperature: currentSettings.temperature,
                maxTokens: currentSettings.maxTokens,
                ...(userData && { user: userData })
            }
        );
        
        let fullText = '';
        
        // Handle streaming response
        if (response.body && typeof response.body.getReader === 'function') {
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = ''; // Буфер для неполных строк
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) {
                    // Обрабатываем оставшиеся данные в буфере
                    if (buffer.trim()) {
                        const lines = buffer.split('\n');
                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') continue;
                                
                                try {
                                    const json = JSON.parse(data);
                                    if (json.content) {
                                        fullText += json.content;
                                        updateBotMessage(botMessageContainer, fullText);
                                    } else if (json.error) {
                                        // Обрабатываем ошибки от сервера
                                        throw new Error(json.error);
                                    }
                                } catch (e) {
                                    if (e instanceof SyntaxError) {
                                        // Не JSON, может быть plain text
                                        if (data.trim() && data !== '[DONE]') {
                                            fullText += data;
                                            updateBotMessage(botMessageContainer, fullText);
                                        }
                                    } else {
                                        // Другая ошибка (например, от сервера)
                                        throw e;
                                    }
                                }
                            } else if (line.trim()) {
                                // Plain text chunk
                                fullText += line;
                                updateBotMessage(botMessageContainer, fullText);
                            }
                        }
                    }
                    break;
                }
                
                // Декодируем с учетом потока для правильной обработки UTF-8
                buffer += decoder.decode(value, { stream: true });
                
                // Обрабатываем полные строки
                const lines = buffer.split('\n');
                // Последняя строка может быть неполной, оставляем её в буфере
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]') continue;
                        
                        try {
                            const json = JSON.parse(data);
                            if (json.content) {
                                fullText += json.content;
                                updateBotMessage(botMessageContainer, fullText);
                            } else if (json.error) {
                                // Обрабатываем ошибки от сервера
                                throw new Error(json.error);
                            }
                        } catch (e) {
                            if (e instanceof SyntaxError) {
                                // Не JSON, может быть plain text
                                if (data.trim() && data !== '[DONE]') {
                                    fullText += data;
                                    updateBotMessage(botMessageContainer, fullText);
                                }
                            } else {
                                // Другая ошибка (например, от сервера)
                                throw e;
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
            const userData = tg.initDataUnsafe?.user ? {
                id: tg.initDataUnsafe.user.id,
                first_name: tg.initDataUnsafe.user.first_name,
                username: tg.initDataUnsafe.user.username
            } : undefined;
            
            const result = await api.sendMessage(
                userMessage,
                currentProvider,
                {
                    temperature: currentSettings.temperature,
                    maxTokens: currentSettings.maxTokens,
                    ...(userData && { user: userData })
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
        gemini: `Я - Gemini 1.5 от Google. Вы спросили: "${userMessage}"\n\nЭто демонстрационный ответ. Для работы с реальным API Gemini необходимо настроить ключ API на сервере.\n\n**Возможности Gemini 1.5:**\n• Мультимодальность\n• Быстрые ответы\n• Понимание изображений\n• Поддержка длинного контекста\n• Интеграция с Google сервисами`,
        claude: `Я - Claude 3 от Anthropic. Вы спросили: "${userMessage}"\n\nЭто демонстрационный ответ. Для работы с реальным API Claude необходимо настроить ключ API на сервере.\n\n**Возможности Claude:**\n• Работа с длинными текстами\n• Безопасность и этика\n• Точный анализ\n• Контекстное понимание`,
        groq: `Я - Llama 3 от Groq. Вы спросили: "${userMessage}"\n\nЭто демонстрационный ответ. Для работы с реальным API Groq необходимо настроить ключ API на сервере.\n\n**Возможности Llama 3:**\n• Очень быстрые ответы\n• Эффективность\n• Открытая модель\n• Низкая задержка`,
        mistral: `Я - Mistral Large. Вы спросили: "${userMessage}"\n\nЭто демонстрационный ответ. Для работы с реальным API Mistral необходимо настроить ключ API на сервере.\n\n**Возможности Mistral:**\n• Многоязычность\n• Эффективность\n• Качественные ответы\n• Европейская разработка`,
        deepseek: `Я - DeepSeek Chat. Вы спросили: "${userMessage}"\n\nЭто демонстрационный ответ. Для работы с реальным API DeepSeek необходимо настроить ключ API на сервере.\n\n**Возможности DeepSeek:**\n• Высокая производительность\n• Эффективность\n• Качественные ответы\n• Поддержка длинного контекста`
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
    
    // Добавляем кнопку копирования
    const copyBtn = createCopyButton(textDiv);
    contentDiv.appendChild(copyBtn);
    
    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    // Прокручиваем к новому сообщению пользователя
    scrollToBottom();
}

// Check if user is near bottom of chat
function isNearBottom(threshold = 100) {
    if (!chatMessages) return false;
    const scrollBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
    return scrollBottom <= threshold;
}

// Scroll to bottom with improved reliability
function scrollToBottom(forceInstant = false, onlyIfNearBottom = false) {
    if (!chatMessages) {
        console.warn('scrollToBottom: chatMessages не найден');
        return;
    }
    
    // Если onlyIfNearBottom = true, прокручиваем только если пользователь уже внизу
    if (onlyIfNearBottom && !isNearBottom()) {
        return;
    }
    
    const performScroll = () => {
        const maxScroll = Math.max(0, chatMessages.scrollHeight - chatMessages.clientHeight);
        
        if (forceInstant) {
            // Мгновенная прокрутка без анимации
            chatMessages.scrollTop = maxScroll;
            updateScrollButtonVisibility();
        } else {
            // Плавная прокрутка
            try {
                chatMessages.scrollTo({
                    top: maxScroll,
                    behavior: 'smooth'
                });
            } catch (e) {
                // Fallback для браузеров, которые не поддерживают scrollTo с options
                chatMessages.scrollTop = maxScroll;
            }
            
            // Проверяем через небольшую задержку, что прокрутка началась
            setTimeout(() => {
                if (!chatMessages) return;
                const scrollBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
                // Если прокрутка не произошла (например, из-за конфликта), делаем мгновенную
                if (scrollBottom > 50) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                }
                updateScrollButtonVisibility();
            }, 150);
        }
    };
    
    // Используем requestAnimationFrame для гарантии, что DOM обновлен
    requestAnimationFrame(() => {
        performScroll();
        
        // Дополнительная проверка для мгновенной прокрутки
        if (forceInstant) {
            setTimeout(() => {
                if (!chatMessages) return;
                const scrollBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
                if (scrollBottom > 10) {
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    updateScrollButtonVisibility();
                }
            }, 50);
        }
    });
}

// Update scroll button visibility based on scroll position
function updateScrollButtonVisibility() {
    if (!scrollToBottomBtn || !chatMessages) return;
    
    // Небольшая задержка для корректного расчета размеров после рендеринга
    requestAnimationFrame(() => {
        // Проверяем, есть ли контент для прокрутки
        const hasScrollableContent = chatMessages.scrollHeight > chatMessages.clientHeight;
        
        if (!hasScrollableContent) {
            // Если контента нет или он помещается на экране, скрываем кнопку
            scrollToBottomBtn.classList.remove('show');
            return;
        }
        
        // Проверяем, находится ли пользователь внизу (с небольшим допуском в 100px)
        const scrollBottom = chatMessages.scrollHeight - chatMessages.scrollTop - chatMessages.clientHeight;
        const isAtBottom = scrollBottom < 100;
        
        if (isAtBottom) {
            scrollToBottomBtn.classList.remove('show');
        } else {
            scrollToBottomBtn.classList.add('show');
        }
    });
}

// Scroll to bottom button click handler
function handleScrollToBottomClick() {
    if (!chatMessages) return;
    // При клике на кнопку всегда используем мгновенную прокрутку
    chatMessages.scrollTop = chatMessages.scrollHeight;
    updateScrollButtonVisibility();
}

// Load chat history from server
async function loadChatHistory() {
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user || !user.id) {
            console.log('No user ID available, skipping history load');
            return;
        }
        
        // Get user's most recent chat
        const result = await api.getChatHistory(user.id);
        
        if (result.success && result.data) {
            // If we have a specific chat with messages, load them
            if (result.data.messages && result.data.messages.length > 0) {
                // Clear existing messages (if any) - удаляем приветственное сообщение тоже
                chatMessages.innerHTML = '';
                
                // Load messages from history
                result.data.messages.forEach(msg => {
                    if (msg.role === 'user' || msg.role === 'assistant') {
                        addMessageFromHistory(msg.content, msg.role);
                    }
                });
                
                // Прокрутить вниз после загрузки всех сообщений
                // Используем более надежный механизм с несколькими попытками
                const ensureScrollToBottom = () => {
                    // Мгновенная прокрутка сразу после рендеринга
                    chatMessages.scrollTop = chatMessages.scrollHeight;
                    
                    // Повторные попытки для учета асинхронного рендеринга контента
                    setTimeout(() => {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                        updateScrollButtonVisibility();
                    }, 50);
                    
                    setTimeout(() => {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                        updateScrollButtonVisibility();
                    }, 150);
                    
                    setTimeout(() => {
                        chatMessages.scrollTop = chatMessages.scrollHeight;
                        updateScrollButtonVisibility();
                    }, 300);
                };
                
                // Запускаем прокрутку после завершения рендеринга
                requestAnimationFrame(() => {
                    ensureScrollToBottom();
                });
                console.log(`Loaded ${result.data.messages.length} messages from history`);
            } else if (result.data.chats && result.data.chats.length > 0) {
                // If we have chats but no messages, load the most recent chat's messages
                const mostRecentChat = result.data.chats[0];
                if (mostRecentChat.id) {
                    const messagesResult = await api.getChatMessages(mostRecentChat.id);
                    if (messagesResult.success && messagesResult.data.messages) {
                        chatMessages.innerHTML = '';
                        messagesResult.data.messages.forEach(msg => {
                            if (msg.role === 'user' || msg.role === 'assistant') {
                                addMessageFromHistory(msg.content, msg.role);
                            }
                        });
                        // Прокрутить вниз после загрузки всех сообщений
                        const ensureScrollToBottom = () => {
                            // Мгновенная прокрутка сразу после рендеринга
                            chatMessages.scrollTop = chatMessages.scrollHeight;
                            
                            // Повторные попытки для учета асинхронного рендеринга контента
                            setTimeout(() => {
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                                updateScrollButtonVisibility();
                            }, 50);
                            
                            setTimeout(() => {
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                                updateScrollButtonVisibility();
                            }, 150);
                            
                            setTimeout(() => {
                                chatMessages.scrollTop = chatMessages.scrollHeight;
                                updateScrollButtonVisibility();
                            }, 300);
                        };
                        
                        // Запускаем прокрутку после завершения рендеринга
                        requestAnimationFrame(() => {
                            ensureScrollToBottom();
                        });
                        console.log(`Loaded ${messagesResult.data.messages.length} messages from chat ${mostRecentChat.id}`);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Failed to load chat history:', error);
        // Don't show error to user, just log it
    }
}

// Add message from history (without sending to API)
function addMessageFromHistory(text, sender) {
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
    
    // Parse markdown for assistant messages
    if (sender === 'assistant' && markdownParser) {
        textDiv.innerHTML = markdownParser.parse(text);
    } else {
        textDiv.textContent = text;
    }
    
    // Добавляем кнопку копирования
    const copyBtn = createCopyButton(textDiv);
    contentDiv.appendChild(copyBtn);
    
    contentDiv.appendChild(textDiv);
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
}

// Copy message to clipboard
function copyMessageToClipboard(text, button) {
    // Получаем чистый текст из HTML, если это HTML элемент
    let textToCopy = text;
    if (typeof text !== 'string') {
        // Если это DOM элемент, извлекаем текст
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = text;
        textToCopy = tempDiv.textContent || tempDiv.innerText || '';
    }
    
    // Копируем в буфер обмена
    navigator.clipboard.writeText(textToCopy).then(() => {
        // Показываем визуальную обратную связь
        const originalHTML = button.innerHTML;
        button.classList.add('copied');
        button.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
            </svg>
        `;
        
        setTimeout(() => {
            button.classList.remove('copied');
            button.innerHTML = originalHTML;
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback: используем старый метод
        const textArea = document.createElement('textarea');
        textArea.value = textToCopy;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            const originalHTML = button.innerHTML;
            button.classList.add('copied');
            button.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
                </svg>
            `;
            setTimeout(() => {
                button.classList.remove('copied');
                button.innerHTML = originalHTML;
            }, 2000);
        } catch (e) {
            alert('Не удалось скопировать сообщение');
        }
        document.body.removeChild(textArea);
    });
}

// Create copy button element
function createCopyButton(textElement) {
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-message-btn';
    copyBtn.setAttribute('aria-label', 'Копировать сообщение');
    copyBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z" fill="currentColor"/>
        </svg>
    `;
    
    copyBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        // Получаем текст из textElement, извлекая чистый текст из HTML
        let textToCopy = '';
        
        // Используем textContent для получения чистого текста без HTML тегов
        if (textElement.textContent) {
            textToCopy = textElement.textContent.trim();
        } else if (textElement.innerText) {
            textToCopy = textElement.innerText.trim();
        } else {
            // Fallback: создаем временный элемент для извлечения текста
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = textElement.innerHTML || '';
            textToCopy = tempDiv.textContent || tempDiv.innerText || '';
        }
        
        // Если текст пустой, пытаемся получить из innerHTML
        if (!textToCopy && textElement.innerHTML) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = textElement.innerHTML;
            textToCopy = tempDiv.textContent || tempDiv.innerText || '';
        }
        
        if (textToCopy) {
            copyMessageToClipboard(textToCopy, copyBtn);
        }
    });
    
    return copyBtn;
}

// Copy table to clipboard (global function for onclick handlers)
window.copyTableToClipboard = function(button) {
    const tableWrapper = button.closest('.table-wrapper');
    const table = tableWrapper.querySelector('table');
    
    if (!table) return;
    
    // Extract table data
    const rows = [];
    const headerRow = [];
    
    // Get headers
    const headers = table.querySelectorAll('thead th');
    headers.forEach(th => {
        headerRow.push(th.textContent.trim());
    });
    rows.push(headerRow);
    
    // Get data rows
    const dataRows = table.querySelectorAll('tbody tr');
    dataRows.forEach(tr => {
        const row = [];
        const cells = tr.querySelectorAll('td');
        cells.forEach(td => {
            row.push(td.textContent.trim());
        });
        rows.push(row);
    });
    
    // Format as markdown table
    let markdown = '';
    rows.forEach((row, index) => {
        markdown += '| ' + row.join(' | ') + ' |\n';
        if (index === 0) {
            // Add separator row
            markdown += '|' + row.map(() => '---').join('|') + '|\n';
        }
    });
    
    // Copy to clipboard
    navigator.clipboard.writeText(markdown.trim()).then(() => {
        // Show feedback
        const originalText = button.textContent;
        button.textContent = '✓';
        button.style.background = '#4caf50';
        setTimeout(() => {
            button.textContent = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy:', err);
        // Fallback: select text
        const textArea = document.createElement('textarea');
        textArea.value = markdown.trim();
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        try {
            document.execCommand('copy');
            button.textContent = '✓';
            button.style.background = '#4caf50';
            setTimeout(() => {
                button.textContent = '📋';
                button.style.background = '';
            }, 2000);
        } catch (e) {
            alert('Не удалось скопировать таблицу. Попробуйте выделить текст вручную.');
        }
        document.body.removeChild(textArea);
    });
}

// Initialize app when DOM is loaded
// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initApp();
    // Also apply adaptive logo on load
    setTimeout(() => {
        applyAdaptiveLogo();
    }, 200);
});

// Listen for system theme changes
if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        applyAdaptiveLogo();
    });
}