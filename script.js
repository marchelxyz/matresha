// Telegram Web App initialization
const tg = window.Telegram.WebApp;

// DOM elements
const navItems = document.querySelectorAll('.nav-item');
const chatMessages = document.getElementById('chatMessages');
const messageInput = document.getElementById('messageInput');
const sendButton = document.getElementById('sendButton');
const charCount = document.getElementById('charCount');
const loadingOverlay = document.getElementById('loadingOverlay');
const userName = document.getElementById('userName');

// State
let currentSection = 'operations';
let isProcessing = false;

// Initialize the app
function initApp() {
    // Configure Telegram Web App
    tg.ready();
    tg.expand();
    
    // Set user info
    const user = tg.initDataUnsafe?.user;
    if (user) {
        userName.textContent = user.first_name || 'Пользователь';
    }
    
    // Set theme
    document.body.style.backgroundColor = tg.themeParams.bg_color || '#ffffff';
    document.body.style.color = tg.themeParams.text_color || '#000000';
    
    // Setup event listeners
    setupEventListeners();
    
    // Show welcome message
    showWelcomeMessage();
}

// Setup event listeners
function setupEventListeners() {
    // Navigation
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const section = item.dataset.section;
            switchSection(section);
        });
    });
    
    // Message input
    messageInput.addEventListener('input', handleInputChange);
    messageInput.addEventListener('keydown', handleKeyDown);
    
    // Send button
    sendButton.addEventListener('click', sendMessage);
    
    // Auto-resize textarea
    messageInput.addEventListener('input', autoResizeTextarea);
}

// Switch between sections
function switchSection(section) {
    currentSection = section;
    
    // Update navigation
    navItems.forEach(item => {
        item.classList.toggle('active', item.dataset.section === section);
    });
    
    // Show section-specific welcome message
    showSectionWelcome(section);
}

// Show section-specific welcome message
function showSectionWelcome(section) {
    const messages = {
        operations: {
            title: 'Операционное управление 📊',
            description: 'Анализ экономических показателей, KPI, рекомендации по улучшению эффективности бизнеса.',
            examples: [
                'Проанализируй рентабельность за последний квартал',
                'Какие показатели нужно улучшить для роста прибыли?',
                'Создай отчет по эффективности продаж'
            ]
        },
        marketing: {
            title: 'Маркетинг и реклама 📈',
            description: 'Настройка рекламных кампаний, креативные решения, анализ эффективности маркетинга.',
            examples: [
                'Помоги настроить рекламу в Яндекс.Директ',
                'Создай креативы для Instagram',
                'Проанализируй конверсию рекламных кампаний'
            ]
        },
        accounting: {
            title: 'Бухгалтерия и финансы 💰',
            description: 'Финансовые отчеты, декларации, расчет налогов, ведение учета по российскому законодательству.',
            examples: [
                'Помоги составить отчет о прибылях и убытках',
                'Рассчитай НДС за квартал',
                'Создай декларацию по УСН'
            ]
        },
        legal: {
            title: 'Юридический отдел ⚖️',
            description: 'Правовые консультации, составление документов, чек-листы по юридическим аспектам бизнеса.',
            examples: [
                'Помоги составить договор с поставщиком',
                'Какие документы нужны для регистрации ООО?',
                'Создай чек-лист по трудовому праву'
            ]
        }
    };
    
    const sectionInfo = messages[section];
    if (!sectionInfo) return;
    
    const welcomeHtml = `
        <div class="message bot-message">
            <div class="message-content">
                <h3>${sectionInfo.title}</h3>
                <p>${sectionInfo.description}</p>
                <p><strong>Примеры запросов:</strong></p>
                <ul>
                    ${sectionInfo.examples.map(example => `<li>${example}</li>`).join('')}
                </ul>
                <p>Напишите ваш вопрос, и я помогу!</p>
            </div>
        </div>
    `;
    
    // Clear previous messages and add new welcome
    chatMessages.innerHTML = welcomeHtml;
    scrollToBottom();
}

// Show initial welcome message
function showWelcomeMessage() {
    showSectionWelcome(currentSection);
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
    
    // Show loading
    showLoading(true);
    
    try {
        // Simulate API call
        const response = await simulateAIResponse(text, currentSection);
        addMessage(response, 'bot');
    } catch (error) {
        addMessage('Извините, произошла ошибка. Попробуйте еще раз.', 'bot');
    } finally {
        showLoading(false);
    }
}

// Add message to chat
function addMessage(text, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Check if text contains markdown-like formatting
    if (text.includes('**') || text.includes('•') || text.includes('\n\n')) {
        contentDiv.innerHTML = formatMessage(text);
    } else {
        contentDiv.textContent = text;
    }
    
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    scrollToBottom();
}

// Format message with basic markdown
function formatMessage(text) {
    return text
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/\n/g, '<br>')
        .replace(/^/, '<p>')
        .replace(/$/, '</p>');
}

// Scroll to bottom
function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Show/hide loading
function showLoading(show) {
    isProcessing = show;
    loadingOverlay.classList.toggle('show', show);
    sendButton.disabled = show || messageInput.value.trim().length === 0;
}

// Simulate AI response based on section
async function simulateAIResponse(userMessage, section) {
    try {
        // Try to use API first
        const response = await api.sendMessage(userMessage, section, {
            user: tg.initDataUnsafe?.user,
            timestamp: new Date().toISOString()
        });
        
        if (response.success) {
            return response.data.response;
        }
    } catch (error) {
        console.log('API not available, using mock response');
    }
    
    // Fallback to mock responses
    const responses = {
        operations: [
            "Анализирую ваши операционные показатели...",
            "На основе предоставленных данных рекомендую:",
            "Ваши KPI показывают следующие тенденции:",
            "Для улучшения операционной эффективности предлагаю:"
        ],
        marketing: [
            "Создаю креативную стратегию для вашей рекламной кампании...",
            "Анализирую целевую аудиторию и конкурентов...",
            "Рекомендую следующие настройки для рекламного кабинета:",
            "Вот несколько креативных идей для вашего продукта:"
        ],
        accounting: [
            "Обрабатываю финансовые данные для составления отчета...",
            "Рассчитываю налоговые обязательства согласно НК РФ...",
            "Формирую отчетность в соответствии с российскими стандартами:",
            "Вот структура вашего финансового отчета:"
        ],
        legal: [
            "Составляю юридический документ на основе ваших данных...",
            "Анализирую правовые аспекты вашего запроса...",
            "Вот шаблон документа с учетом российского законодательства:",
            "Создаю чек-лист по юридическим требованиям:"
        ]
    };
    
    const sectionResponses = responses[section] || responses.operations;
    const randomResponse = sectionResponses[Math.floor(Math.random() * sectionResponses.length)];
    
    // Generate contextual response
    let response = randomResponse + "\n\n";
    
    if (section === 'operations') {
        response += "📊 **Анализ показателей:**\n";
        response += "• Рентабельность: 15.2% (цель: 18%)\n";
        response += "• Оборачиваемость: 45 дней (цель: 30 дней)\n";
        response += "• Маржинальность: 22% (хорошо)\n\n";
        response += "💡 **Рекомендации:**\n";
        response += "1. Оптимизировать управление запасами\n";
        response += "2. Улучшить процессы продаж\n";
        response += "3. Внедрить автоматизацию учета";
    } else if (section === 'marketing') {
        response += "📈 **Маркетинговая стратегия:**\n";
        response += "• Целевая аудитория: 25-45 лет, средний доход\n";
        response += "• Каналы: Яндекс.Директ, Google Ads, соцсети\n";
        response += "• Бюджет: 50,000₽/месяц\n\n";
        response += "🎨 **Креативы:**\n";
        response += "1. Видео-ролик 15 сек для Instagram\n";
        response += "2. Баннеры для контекстной рекламы\n";
        response += "3. Email-рассылка с персонализацией";
    } else if (section === 'accounting') {
        response += "💰 **Финансовый отчет:**\n";
        response += "• Выручка: 2,500,000₽\n";
        response += "• Расходы: 1,800,000₽\n";
        response += "• Прибыль: 700,000₽\n\n";
        response += "📋 **Налоги (УСН 6%):**\n";
        response += "• Налоговая база: 2,500,000₽\n";
        response += "• Сумма налога: 150,000₽\n";
        response += "• К доплате: 150,000₽";
    } else if (section === 'legal') {
        response += "⚖️ **Юридический документ:**\n";
        response += "ДОГОВОР ПОСТАВКИ\n\n";
        response += "**Стороны:**\n";
        response += "• Поставщик: [Ваши реквизиты]\n";
        response += "• Покупатель: [Реквизиты контрагента]\n\n";
        response += "**Предмет договора:**\n";
        response += "Поставка товаров согласно спецификации\n\n";
        response += "**Условия:**\n";
        response += "• Срок поставки: 10 рабочих дней\n";
        response += "• Оплата: 50% предоплата, 50% по факту\n";
        response += "• Ответственность: согласно ГК РФ";
    }
    
    return response;
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);