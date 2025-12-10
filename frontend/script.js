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
const providerSidebar = document.getElementById('providerSidebar');
const providerSidebarOverlay = document.getElementById('providerSidebarOverlay');
const providerSidebarClose = document.getElementById('providerSidebarClose');
const providerSelectorBtn = document.getElementById('providerSelectorBtn');
const providerList = document.getElementById('providerList');
const currentProviderName = document.getElementById('currentProviderName');
const chatsSidebar = document.getElementById('chatsSidebar');
const chatsSidebarOverlay = document.getElementById('chatsSidebarOverlay');
const chatsSidebarClose = document.getElementById('chatsSidebarClose');
const chatsMenuBtn = document.getElementById('chatsMenuBtn');
const chatsList = document.getElementById('chatsList');
const newChatBtn = document.getElementById('newChatBtn');

// State
let isProcessing = false;
let currentProvider = 'openai';
let currentSettings = {
    temperature: 0.7,
    maxTokens: 2000
};
let markdownParser = null;
let selectedFiles = []; // Массив выбранных файлов
let currentChatId = null; // Текущий активный чат
let chats = []; // Список чатов

// Provider configurations
const providers = {
    openai: { name: 'OpenAI', model: 'GPT-4', displayName: 'OpenAI' },
    gemini: { name: 'Google Gemini', model: 'Gemini 1.5', displayName: 'Google Gemini' },
    claude: { name: 'Anthropic Claude', model: 'Claude 3', displayName: 'Anthropic Claude' },
    groq: { name: 'Llama 3.3', model: 'llama-3.3-70b-versatile', displayName: 'Groq' },
    mistral: { name: 'Mistral Large', model: 'mistral-large-latest', displayName: 'Mistral AI' },
    deepseek: { name: 'DeepSeek Chat', model: 'deepseek-chat', displayName: 'DeepSeek' },
    openrouter: { name: 'OpenRouter', model: 'openai/gpt-4o', displayName: 'OpenRouter' }
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
    
    // Если нет сообщений, добавляем приветственное сообщение
    if (!chatMessages || chatMessages.children.length === 0) {
        addWelcomeMessage();
    }
    
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
    
    // Provider sidebar
    if (providerSelectorBtn) {
        providerSelectorBtn.addEventListener('click', () => {
            openProviderSidebar();
        });
    }
    
    if (providerSidebarClose) {
        providerSidebarClose.addEventListener('click', () => {
            closeProviderSidebar();
        });
    }
    
    if (providerSidebarOverlay) {
        providerSidebarOverlay.addEventListener('click', () => {
            closeProviderSidebar();
        });
    }
    
    // Provider items
    if (providerList) {
        providerList.addEventListener('click', (e) => {
            const providerItem = e.target.closest('.provider-item');
            if (providerItem) {
                const provider = providerItem.dataset.provider;
                selectProvider(provider);
                closeProviderSidebar();
            }
        });
    }
    
    // Chats sidebar
    if (chatsMenuBtn) {
        chatsMenuBtn.addEventListener('click', () => {
            openChatsSidebar();
        });
    }
    
    if (chatsSidebarClose) {
        chatsSidebarClose.addEventListener('click', () => {
            closeChatsSidebar();
        });
    }
    
    if (chatsSidebarOverlay) {
        chatsSidebarOverlay.addEventListener('click', () => {
            closeChatsSidebar();
        });
    }
    
    if (newChatBtn) {
        newChatBtn.addEventListener('click', () => {
            createNewChat();
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
    if (provider) {
        if (modelInfo) {
            modelInfo.textContent = provider.name;
        }
        if (currentProviderName) {
            currentProviderName.textContent = provider.displayName || provider.name;
        }
        if (settingsProvider) {
            settingsProvider.value = currentProvider;
        }
        if (aiProvider) {
            aiProvider.value = currentProvider;
        }
        // Update active provider in sidebar
        updateProviderSidebar();
    }
}

// Provider sidebar functions
function openProviderSidebar() {
    if (providerSidebar && providerSidebarOverlay) {
        providerSidebar.classList.add('show');
        providerSidebarOverlay.classList.add('show');
        if (providerSelectorBtn) {
            providerSelectorBtn.classList.add('active');
        }
    }
}

function closeProviderSidebar() {
    if (providerSidebar && providerSidebarOverlay) {
        providerSidebar.classList.remove('show');
        providerSidebarOverlay.classList.remove('show');
        if (providerSelectorBtn) {
            providerSelectorBtn.classList.remove('active');
        }
    }
}

function selectProvider(provider) {
    if (providers[provider]) {
        currentProvider = provider;
        updateProviderInfo();
        saveSettings();
    }
}

function updateProviderSidebar() {
    if (!providerList) return;
    const items = providerList.querySelectorAll('.provider-item');
    items.forEach(item => {
        if (item.dataset.provider === currentProvider) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

// Chats sidebar functions
function openChatsSidebar() {
    if (chatsSidebar && chatsSidebarOverlay) {
        chatsSidebar.classList.add('show');
        chatsSidebarOverlay.classList.add('show');
        loadChatsList();
    }
}

function closeChatsSidebar() {
    if (chatsSidebar && chatsSidebarOverlay) {
        chatsSidebar.classList.remove('show');
        chatsSidebarOverlay.classList.remove('show');
    }
}

function createNewChat() {
    currentChatId = null;
    chatMessages.innerHTML = '';
    addWelcomeMessage();
    closeChatsSidebar();
    scrollToBottom();
    // Обновляем список чатов после создания нового
    if (chatsSidebar && chatsSidebar.classList.contains('show')) {
        loadChatsList();
    }
}

function addWelcomeMessage() {
    const welcomeDiv = document.createElement('div');
    welcomeDiv.className = 'welcome-message';
    welcomeDiv.innerHTML = `
        <div class="message bot-message">
            <div class="message-avatar">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM13 17H11V15H13V17ZM13 13H11V7H13V13Z" fill="currentColor"/>
                </svg>
            </div>
            <div class="message-content">
                <div class="message-text">
                    <h3>Добро пожаловать в AI Assistant! 🤖</h3>
                    <p>Я ваш универсальный AI-помощник с поддержкой самых мощных нейросетей:</p>
                    <ul>
                        <li><strong>OpenAI GPT-4</strong> - для сложных задач и анализа</li>
                        <li><strong>Google Gemini</strong> - для креативных решений</li>
                        <li><strong>Anthropic Claude</strong> - для длинных текстов</li>
                        <li><strong>Groq (Llama)</strong> - для быстрых ответов</li>
                        <li><strong>Mistral AI</strong> - для многоязычных задач</li>
                        <li><strong>DeepSeek Chat</strong> - для эффективных и качественных ответов</li>
                    </ul>
                    <p>Выберите модель в шапке и начните общение!</p>
                </div>
            </div>
        </div>
    `;
    chatMessages.appendChild(welcomeDiv);
}

async function loadChatsList() {
    if (!chatsList) return;
    
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user || !user.id) {
            chatsList.innerHTML = '<div class="chats-empty">Войдите в систему</div>';
            return;
        }
        
        // Загружаем чаты и группы с сервера
        const result = await api.getChatHistory(user.id);
        
        if (result.success && result.data) {
            renderChatsList(result.data);
        } else {
            chatsList.innerHTML = '<div class="chats-empty">Нет сохраненных чатов</div>';
        }
    } catch (error) {
        console.error('Failed to load chats:', error);
        chatsList.innerHTML = '<div class="chats-empty">Ошибка загрузки чатов</div>';
    }
}

function renderChatsList(data) {
    if (!chatsList) return;
    
    chatsList.innerHTML = '';
    
    // Кнопка создания новой группы
    const createGroupBtn = document.createElement('button');
    createGroupBtn.className = 'create-group-btn';
    createGroupBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
        </svg>
        <span>Создать группу</span>
    `;
    createGroupBtn.addEventListener('click', () => {
        createNewGroup();
    });
    chatsList.appendChild(createGroupBtn);
    
    // Группы чатов
    if (data.groups && Object.keys(data.groups).length > 0) {
        Object.values(data.groups).forEach(groupData => {
            const groupElement = createGroupElement(groupData.group, groupData.chats);
            chatsList.appendChild(groupElement);
        });
    }
    
    // Чаты без группы
    if (data.chats_without_group && data.chats_without_group.length > 0) {
        const ungroupedSection = document.createElement('div');
        ungroupedSection.className = 'chats-section';
        ungroupedSection.innerHTML = '<div class="chats-section-title">Чаты</div>';
        
        data.chats_without_group.forEach(chat => {
            const chatElement = createChatElement(chat);
            ungroupedSection.appendChild(chatElement);
        });
        
        chatsList.appendChild(ungroupedSection);
    }
    
    // Если нет чатов и групп
    if ((!data.groups || Object.keys(data.groups).length === 0) && 
        (!data.chats_without_group || data.chats_without_group.length === 0)) {
        chatsList.innerHTML = '<div class="chats-empty">Нет сохраненных чатов</div>';
    }
}

function createGroupElement(group, chats) {
    const groupDiv = document.createElement('div');
    groupDiv.className = 'chat-group';
    groupDiv.dataset.groupId = group.id;
    
    const groupHeader = document.createElement('div');
    groupHeader.className = 'chat-group-header';
    groupHeader.innerHTML = `
        <div class="chat-group-name">${group.name}</div>
        <div class="chat-group-actions">
            <button class="chat-group-action-btn" data-action="edit" aria-label="Редактировать группу">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/>
                </svg>
            </button>
            <button class="chat-group-action-btn" data-action="delete" aria-label="Удалить группу">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                </svg>
            </button>
        </div>
    `;
    
    // Обработчики действий группы
    groupHeader.querySelector('[data-action="edit"]').addEventListener('click', (e) => {
        e.stopPropagation();
        editGroup(group.id, group.name);
    });
    
    groupHeader.querySelector('[data-action="delete"]').addEventListener('click', (e) => {
        e.stopPropagation();
        deleteGroup(group.id);
    });
    
    const chatsContainer = document.createElement('div');
    chatsContainer.className = 'chat-group-chats';
    
    if (chats && chats.length > 0) {
        chats.forEach(chat => {
            const chatElement = createChatElement(chat, group.id);
            chatsContainer.appendChild(chatElement);
        });
    } else {
        chatsContainer.innerHTML = '<div class="chats-empty">Нет чатов в группе</div>';
    }
    
    groupDiv.appendChild(groupHeader);
    groupDiv.appendChild(chatsContainer);
    
    return groupDiv;
}

function createChatElement(chat, groupId = null) {
    const chatDiv = document.createElement('div');
    chatDiv.className = 'chat-item';
    if (currentChatId === chat.id) {
        chatDiv.classList.add('active');
    }
    
    const title = chat.title || `Чат ${chat.id}`;
    chatDiv.innerHTML = `
        <div class="chat-item-title">${title}</div>
        <div class="chat-item-actions">
            ${groupId ? '' : `
                <button class="chat-item-action" data-action="add-to-group" aria-label="Добавить в группу">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" fill="currentColor"/>
                    </svg>
                </button>
            `}
            <button class="chat-item-action" data-action="delete" aria-label="Удалить чат">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z" fill="currentColor"/>
                </svg>
            </button>
        </div>
    `;
    
    // Клик по чату - загрузить его
    chatDiv.addEventListener('click', async (e) => {
        if (e.target.closest('.chat-item-action')) return;
        await loadChat(chat.id);
    });
    
    // Обработчики действий
    if (!groupId) {
        chatDiv.querySelector('[data-action="add-to-group"]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showAddToGroupDialog(chat.id);
        });
    }
    
    chatDiv.querySelector('[data-action="delete"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteChat(chat.id);
    });
    
    return chatDiv;
}

async function createNewGroup() {
    const name = prompt('Введите название группы:');
    if (!name || !name.trim()) return;
    
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user || !user.id) return;
        
        const result = await api.createChatGroup(user.id, name.trim());
        if (result.success) {
            await loadChatsList();
        } else {
            alert('Ошибка создания группы: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Failed to create group:', error);
        alert('Ошибка создания группы');
    }
}

async function editGroup(groupId, currentName) {
    const name = prompt('Введите новое название группы:', currentName);
    if (!name || !name.trim() || name === currentName) return;
    
    try {
        const result = await api.updateChatGroup(groupId, name.trim());
        if (result.success) {
            await loadChatsList();
        } else {
            alert('Ошибка обновления группы: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Failed to update group:', error);
        alert('Ошибка обновления группы');
    }
}

async function deleteGroup(groupId) {
    if (!confirm('Удалить группу? Чаты из группы не будут удалены.')) return;
    
    try {
        const result = await api.deleteChatGroup(groupId);
        if (result.success) {
            await loadChatsList();
        } else {
            alert('Ошибка удаления группы: ' + (result.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Failed to delete group:', error);
        alert('Ошибка удаления группы');
    }
}

async function showAddToGroupDialog(chatId) {
    try {
        const user = tg.initDataUnsafe?.user;
        if (!user || !user.id) return;
        
        const result = await api.getChatGroups(user.id);
        if (!result.success || !result.data.groups || result.data.groups.length === 0) {
            alert('Сначала создайте группу');
            return;
        }
        
        const groups = result.data.groups;
        const groupNames = groups.map(g => g.name);
        groupNames.push('(Без группы)');
        
        const selected = prompt(`Выберите группу:\n${groups.map((g, i) => `${i + 1}. ${g.name}`).join('\n')}\n${groups.length + 1}. (Без группы)`);
        if (!selected) return;
        
        const index = parseInt(selected) - 1;
        if (index < 0 || index > groups.length) return;
        
        const groupId = index < groups.length ? groups[index].id : null;
        
        const addResult = await api.addChatToGroup(chatId, groupId);
        if (addResult.success) {
            await loadChatsList();
        } else {
            alert('Ошибка добавления чата в группу: ' + (addResult.error || 'Неизвестная ошибка'));
        }
    } catch (error) {
        console.error('Failed to add chat to group:', error);
        alert('Ошибка добавления чата в группу');
    }
}

async function deleteChat(chatId) {
    if (!confirm('Удалить этот чат?')) return;
    
    // TODO: Добавить API endpoint для удаления чата
    alert('Функция удаления чата будет реализована позже');
}

async function loadChat(chatId) {
    try {
        currentChatId = chatId;
        const result = await api.getChatMessages(chatId);
        
        if (result.success && result.data.messages) {
            chatMessages.innerHTML = '';
            result.data.messages.forEach(msg => {
                if (msg.role === 'user' || msg.role === 'assistant') {
                    addMessageFromHistory(msg.content, msg.role, msg.attachments || []);
                }
            });
            
            closeChatsSidebar();
            scrollToBottom(true);
        }
    } catch (error) {
        console.error('Failed to load chat:', error);
        alert('Ошибка загрузки чата');
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
    
    // Add user message with attachments
    addMessage(text, 'user', selectedFiles);
    
    // Clear input and files
    const filesToSend = [...selectedFiles];
    messageInput.value = '';
    selectedFiles = [];
    updateAttachedFilesDisplay();
    autoResizeTextarea();
    handleInputChange();
    
    // Set processing state
    isProcessing = true;
    sendButton.disabled = true;
    
    // Create bot message container for streaming
    const botMessageDiv = createBotMessageContainer();
    
    try {
        // Если есть файлы, загружаем их и отправляем вместе с текстом
        if (filesToSend.length > 0) {
            await sendMessageWithFiles(text, filesToSend, botMessageDiv);
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
        
        // Получаем chat_id из заголовков ответа
        const chatIdFromHeader = response.headers.get('X-Chat-Id');
        if (chatIdFromHeader) {
            currentChatId = parseInt(chatIdFromHeader);
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
                                    } else if (json.chat_id) {
                                        // Сохраняем chat_id из ответа
                                        currentChatId = json.chat_id;
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
                            } else if (json.chat_id) {
                                // Сохраняем chat_id из ответа
                                currentChatId = json.chat_id;
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
            
            // Обновляем список чатов после получения ответа
            if (currentChatId && chatsSidebar && chatsSidebar.classList.contains('show')) {
                await loadChatsList();
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
    // Автоматически прокручиваем вниз во время стриминга ответа ИИ
    // Используем requestAnimationFrame для плавной прокрутки
    requestAnimationFrame(() => {
        if (chatMessages) {
            const maxScroll = Math.max(0, chatMessages.scrollHeight - chatMessages.clientHeight);
            chatMessages.scrollTop = maxScroll;
            updateScrollButtonVisibility();
        }
    });
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
        
        // Получаем chat_id из заголовков ответа
        const chatIdFromHeader = response.headers.get('X-Chat-Id');
        if (chatIdFromHeader) {
            currentChatId = parseInt(chatIdFromHeader);
        }
        
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
                                    } else if (json.chat_id) {
                                        // Сохраняем chat_id из ответа
                                        currentChatId = json.chat_id;
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
                            } else if (json.chat_id) {
                                // Сохраняем chat_id из ответа
                                currentChatId = json.chat_id;
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
            
            // Обновляем список чатов после получения ответа
            if (currentChatId && chatsSidebar && chatsSidebar.classList.contains('show')) {
                await loadChatsList();
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
                // Сохраняем chat_id из ответа
                if (result.data.chat_id) {
                    currentChatId = result.data.chat_id;
                    // Обновляем список чатов после получения ответа
                    if (chatsSidebar && chatsSidebar.classList.contains('show')) {
                        await loadChatsList();
                    }
                }
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
        deepseek: `Я - DeepSeek Chat. Вы спросили: "${userMessage}"\n\nЭто демонстрационный ответ. Для работы с реальным API DeepSeek необходимо настроить ключ API на сервере.\n\n**Возможности DeepSeek:**\n• Высокая производительность\n• Эффективность\n• Качественные ответы\n• Поддержка длинного контекста`,
        openrouter: `Я - OpenRouter. Вы спросили: "${userMessage}"\n\nЭто демонстрационный ответ. Для работы с реальным API OpenRouter необходимо настроить ключ API на сервере.\n\n**Возможности OpenRouter:**\n• Доступ к множеству моделей через единый API\n• Модели от OpenAI, Anthropic, Google, Meta и других\n• Гибкость выбора модели\n• Удобное управление балансом\n• Документация: https://openrouter.ai/docs`
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
function addMessage(text, sender, attachments = []) {
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
    
    // Добавляем вложения (изображения и файлы)
    if (attachments && attachments.length > 0) {
        attachments.forEach(file => {
            const attachmentDiv = createAttachmentElement(file);
            if (attachmentDiv) {
                contentDiv.appendChild(attachmentDiv);
            }
        });
    }
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    if (text) {
        textDiv.textContent = text;
    } else {
        textDiv.style.display = 'none';
    }
    
    // Добавляем кнопку копирования
    const copyBtn = createCopyButton(textDiv);
    contentDiv.appendChild(copyBtn);
    
    if (text) {
        contentDiv.appendChild(textDiv);
    }
    messageDiv.appendChild(contentDiv);
    
    chatMessages.appendChild(messageDiv);
    // Прокручиваем к новому сообщению пользователя
    scrollToBottom();
}

// Create attachment element (image or file)
function createAttachmentElement(file) {
    const attachmentDiv = document.createElement('div');
    attachmentDiv.className = 'message-attachment';
    
    // Проверяем, является ли файл изображением
    if (file.type && file.type.startsWith('image/')) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'message-image-container';
        
        // Определяем соотношение сторон
        const img = new Image();
        img.onload = function() {
            const aspectRatio = img.width / img.height;
            let aspectClass = 'aspect-16-9'; // По умолчанию
            
            if (aspectRatio > 1.3) {
                aspectClass = 'aspect-16-9';
            } else if (aspectRatio > 0.9) {
                aspectClass = 'aspect-4-3';
            } else if (aspectRatio > 0.7) {
                aspectClass = 'aspect-1-1';
            } else {
                aspectClass = 'aspect-3-4';
            }
            
            imageContainer.className = `message-image-container ${aspectClass}`;
        };
        
        img.src = URL.createObjectURL(file);
        img.className = 'message-image';
        img.onclick = () => {
            // Открыть изображение в полном размере
            window.open(img.src, '_blank');
        };
        
        imageContainer.appendChild(img);
        attachmentDiv.appendChild(imageContainer);
    } else {
        // Файл (не изображение)
        const fileDiv = document.createElement('div');
        fileDiv.className = 'message-file';
        
        const fileIcon = document.createElement('div');
        fileIcon.className = 'file-icon';
        
        // Определяем тип файла и устанавливаем соответствующую иконку
        const fileName = file.name.toLowerCase();
        let iconClass = 'default';
        let iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/></svg>';
        
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
            iconClass = 'excel';
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 14H9v-2h4v2zm0-4H9v-2h4v2zm2-4H9V6h6v2z" fill="currentColor"/></svg>';
        } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
            iconClass = 'word';
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 14H9v-2h4v2zm0-4H9v-2h4v2zm2-4H9V6h6v2z" fill="currentColor"/></svg>';
        } else if (fileName.endsWith('.pdf')) {
            iconClass = 'pdf';
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 14H9v-2h4v2zm0-4H9v-2h4v2zm2-4H9V6h6v2z" fill="currentColor"/></svg>';
        } else if (file.type && file.type.startsWith('image/')) {
            iconClass = 'image';
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/></svg>';
        }
        
        fileIcon.className = `file-icon ${iconClass}`;
        fileIcon.innerHTML = iconSvg;
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileNameDiv = document.createElement('div');
        fileNameDiv.className = 'file-name';
        fileNameDiv.textContent = file.name;
        
        const fileSizeDiv = document.createElement('div');
        fileSizeDiv.className = 'file-size';
        fileSizeDiv.textContent = formatFileSize(file.size);
        
        fileInfo.appendChild(fileNameDiv);
        fileInfo.appendChild(fileSizeDiv);
        
        fileDiv.appendChild(fileIcon);
        fileDiv.appendChild(fileInfo);
        attachmentDiv.appendChild(fileDiv);
    }
    
    return attachmentDiv;
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
    // Прокручиваем плавно с самого верха до самого низа
    const maxScroll = Math.max(0, chatMessages.scrollHeight - chatMessages.clientHeight);
    
    // Используем плавную прокрутку
    try {
        chatMessages.scrollTo({
            top: maxScroll,
            behavior: 'smooth'
        });
    } catch (e) {
        // Fallback для браузеров, которые не поддерживают scrollTo с options
        chatMessages.scrollTop = maxScroll;
    }
    
    // Обновляем видимость кнопки после завершения прокрутки
    setTimeout(() => {
        updateScrollButtonVisibility();
    }, 500);
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
                        addMessageFromHistory(msg.content, msg.role, msg.attachments || []);
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
function addMessageFromHistory(text, sender, attachments = []) {
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
    
    // Добавляем вложения из истории (если есть URL или base64)
    if (attachments && attachments.length > 0) {
        attachments.forEach(attachment => {
            const attachmentDiv = createAttachmentElementFromHistory(attachment);
            if (attachmentDiv) {
                contentDiv.appendChild(attachmentDiv);
            }
        });
    }
    
    const textDiv = document.createElement('div');
    textDiv.className = 'message-text';
    
    // Parse markdown for assistant messages
    if (sender === 'assistant' && markdownParser) {
        textDiv.innerHTML = markdownParser.parse(text);
    } else {
        textDiv.textContent = text || '';
    }
    
    if (text) {
        // Добавляем кнопку копирования
        const copyBtn = createCopyButton(textDiv);
        contentDiv.appendChild(copyBtn);
        contentDiv.appendChild(textDiv);
    }
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
}

// Create attachment element from history (with URL or base64)
function createAttachmentElementFromHistory(attachment) {
    const attachmentDiv = document.createElement('div');
    attachmentDiv.className = 'message-attachment';
    
    // Проверяем, является ли вложение изображением
    if (attachment.type && attachment.type.startsWith('image/') && attachment.url) {
        const imageContainer = document.createElement('div');
        imageContainer.className = 'message-image-container';
        
        const img = document.createElement('img');
        img.src = attachment.url;
        img.className = 'message-image';
        img.onclick = () => {
            window.open(attachment.url, '_blank');
        };
        
        // Определяем соотношение сторон после загрузки
        img.onload = function() {
            const aspectRatio = img.naturalWidth / img.naturalHeight;
            let aspectClass = 'aspect-16-9';
            
            if (aspectRatio > 1.3) {
                aspectClass = 'aspect-16-9';
            } else if (aspectRatio > 0.9) {
                aspectClass = 'aspect-4-3';
            } else if (aspectRatio > 0.7) {
                aspectClass = 'aspect-1-1';
            } else {
                aspectClass = 'aspect-3-4';
            }
            
            imageContainer.className = `message-image-container ${aspectClass}`;
        };
        
        imageContainer.appendChild(img);
        attachmentDiv.appendChild(imageContainer);
    } else if (attachment.name) {
        // Файл (не изображение)
        const fileDiv = document.createElement('div');
        fileDiv.className = 'message-file';
        
        const fileIcon = document.createElement('div');
        fileIcon.className = 'file-icon';
        
        const fileName = attachment.name.toLowerCase();
        let iconClass = 'default';
        let iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z" fill="currentColor"/></svg>';
        
        if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) {
            iconClass = 'excel';
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 14H9v-2h4v2zm0-4H9v-2h4v2zm2-4H9V6h6v2z" fill="currentColor"/></svg>';
        } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
            iconClass = 'word';
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 14H9v-2h4v2zm0-4H9v-2h4v2zm2-4H9V6h6v2z" fill="currentColor"/></svg>';
        } else if (fileName.endsWith('.pdf')) {
            iconClass = 'pdf';
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm-1 14H9v-2h4v2zm0-4H9v-2h4v2zm2-4H9V6h6v2z" fill="currentColor"/></svg>';
        } else if (attachment.type && attachment.type.startsWith('image/')) {
            iconClass = 'image';
            iconSvg = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z" fill="currentColor"/></svg>';
        }
        
        fileIcon.className = `file-icon ${iconClass}`;
        fileIcon.innerHTML = iconSvg;
        
        const fileInfo = document.createElement('div');
        fileInfo.className = 'file-info';
        
        const fileNameDiv = document.createElement('div');
        fileNameDiv.className = 'file-name';
        fileNameDiv.textContent = attachment.name;
        
        const fileSizeDiv = document.createElement('div');
        fileSizeDiv.className = 'file-size';
        fileSizeDiv.textContent = attachment.size ? formatFileSize(attachment.size) : '';
        
        fileInfo.appendChild(fileNameDiv);
        fileInfo.appendChild(fileSizeDiv);
        
        fileDiv.appendChild(fileIcon);
        fileDiv.appendChild(fileInfo);
        
        if (attachment.url) {
            fileDiv.onclick = () => {
                window.open(attachment.url, '_blank');
            };
            fileDiv.style.cursor = 'pointer';
        }
        
        attachmentDiv.appendChild(fileDiv);
    }
    
    return attachmentDiv;
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