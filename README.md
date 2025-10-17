# Business Assistant - Telegram Mini App

Умный помощник для ведения бизнеса в России. Telegram Mini App с оптимизацией под мобильные и десктопные экраны.

## Описание

Приложение служит помощником для бизнеса - обрабатывает данные, дает рекомендации, создает документы. Работает по 4 направлениям:

1. **Операционное управление** - экономические показатели, их анализ и заключение по улучшению
2. **Маркетинг** - настройка рекламных кабинетов и кампаний, креативный помощник
3. **Бухгалтерия** - подсчет финансовых потоков, формирование отчетов и деклараций для РФ
4. **Юридический отдел** - помощь по юридическим аспектам, конструирование документов

## Структура проекта

```
├── backend/                 # Backend сервер (Railway)
│   ├── routers/            # API роутеры
│   ├── services/           # Бизнес-логика
│   ├── models/             # Модели данных
│   ├── utils/              # Утилиты
│   ├── server.py           # Основной сервер
│   └── requirements.txt    # Python зависимости
├── frontend/               # Frontend приложение (Vercel)
│   ├── pages/              # Страницы приложения
│   ├── components/         # React компоненты
│   ├── services/           # API сервисы
│   ├── styles/             # CSS стили
│   ├── index.html          # Главная страница
│   ├── script.js           # Основной JavaScript
│   ├── api.js              # API клиент
│   └── telegram-config.js  # Конфигурация Telegram
├── package.json            # Node.js зависимости
└── README.md              # Документация
```

## Технологии

- **Frontend**: HTML5, CSS3, JavaScript (ES6+), Telegram Web App API
- **Backend**: Python, HTTP Server
- **База данных**: PostgreSQL
- **Хостинг**: Railway (backend), Vercel (frontend)
- **Репозиторий**: GitHub

## Особенности интерфейса

- **Боковое меню** с возможностью сворачивания
- **Адаптивный дизайн** для мобильных и десктопных устройств
- **ChatGPT-подобный интерфейс** для общения с AI
- **4 основных раздела** с специализированными функциями
- **Темная/светлая тема** в зависимости от настроек Telegram

## Установка и запуск

### Локальная разработка

1. Клонируйте репозиторий:
```bash
git clone https://github.com/your-username/business-assistant-telegram.git
cd business-assistant-telegram
```

2. Установите зависимости:
```bash
npm install
```

3. Запустите backend:
```bash
npm run dev:backend
```

4. Запустите frontend:
```bash
npm run dev:frontend
```

### Продакшн

1. **Backend (Railway)**:
   - Подключите репозиторий к Railway
   - Настройте переменные окружения
   - Деплой автоматически при push в main

2. **Frontend (Vercel)**:
   - Подключите папку `frontend/` к Vercel
   - Настройте домен
   - Деплой автоматически при push в main

## API Endpoints

### Операционное управление
- `POST /api/operations/kpi-analysis` - Анализ KPI
- `POST /api/operations/financial-report` - Финансовые отчеты
- `POST /api/operations/optimization` - Рекомендации по оптимизации

### Маркетинг
- `POST /api/marketing/campaign` - Создание рекламных кампаний
- `POST /api/marketing/creatives` - Генерация креативов
- `POST /api/marketing/audience` - Анализ аудитории

### Бухгалтерия
- `POST /api/accounting/tax-calculation` - Расчет налогов
- `POST /api/accounting/tax-report` - Налоговые отчеты
- `POST /api/accounting/financial-statement` - Финансовая отчетность

### Юридический отдел
- `POST /api/legal/document` - Генерация документов
- `POST /api/legal/checklist` - Юридические чек-листы
- `POST /api/legal/consultation` - Правовые консультации

### AI Chat
- `POST /api/ai/chat` - Общение с AI-ассистентом

## Конфигурация

Настройте переменные окружения в файле `frontend/telegram-config.js`:

```javascript
const TelegramConfig = {
    BOT_TOKEN: 'YOUR_BOT_TOKEN_HERE',
    WEB_APP_URL: 'https://your-domain.com',
    API_BASE_URL: 'https://your-api-domain.com/api'
};
```

## Разработка

### Структура файлов

- **Backend**: Python сервер с модульной архитектурой
- **Frontend**: Модульный JavaScript с разделением по функциональности
- **Стили**: CSS с поддержкой темной темы и адаптивности

### Добавление новых функций

1. Создайте новый роутер в `backend/routers/`
2. Добавьте сервис в `backend/services/`
3. Обновите API клиент в `frontend/api.js`
4. Добавьте UI компонент в `frontend/components/`

## Лицензия

MIT License

## Поддержка

Для вопросов и предложений создавайте Issues в GitHub репозитории.