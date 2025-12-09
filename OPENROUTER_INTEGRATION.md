# Интеграция OpenRouter API

OpenRouter предоставляет единый API для доступа к множеству языковых моделей от различных провайдеров, включая OpenAI, Anthropic, Google, Meta и других.

## Что такое OpenRouter?

OpenRouter - это агрегатор AI-моделей, который позволяет использовать различные модели через единый API. Это упрощает переключение между моделями и управление балансом.

**Преимущества:**
- Доступ к множеству моделей через один API
- Единый баланс для всех моделей
- Гибкость выбора модели
- Прозрачное ценообразование
- Простая интеграция

**Официальный сайт:** https://openrouter.ai/

## Быстрый старт

### 1. Получение API ключа

1. Зарегистрируйтесь на [OpenRouter.ai](https://openrouter.ai/)
2. Перейдите в раздел [API Keys](https://openrouter.ai/keys)
3. Создайте новый API ключ
4. Скопируйте ключ (формат: `sk-or-v1-...`)

### 2. Настройка переменных окружения

Добавьте ключ в файл `.env` в директории `backend/`:

```bash
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

**Опционально** (для идентификации приложения):
```bash
OPENROUTER_APP_URL=https://your-app-url.com
OPENROUTER_APP_NAME=AI Assistant
```

### 3. Для Railway (продакшн)

1. Откройте ваш проект на [Railway](https://railway.app/)
2. Перейдите в раздел Variables
3. Добавьте переменную:
   - **Name:** `OPENROUTER_API_KEY`
   - **Value:** ваш API ключ от OpenRouter
4. Перезапустите сервис

### 4. Пополнение баланса

1. Перейдите на [OpenRouter Credits](https://openrouter.ai/credits)
2. Пополните баланс (минимальная сумма обычно $5)
3. Баланс будет использоваться для всех моделей автоматически

## Доступные модели

OpenRouter поддерживает множество моделей. Вот некоторые популярные:

### OpenAI модели
- `openai/gpt-4o` - GPT-4 Optimized (рекомендуется)
- `openai/gpt-4-turbo` - GPT-4 Turbo
- `openai/gpt-3.5-turbo` - GPT-3.5 Turbo (бюджетный вариант)

### Anthropic модели
- `anthropic/claude-3-opus` - Claude 3 Opus
- `anthropic/claude-3-sonnet` - Claude 3 Sonnet
- `anthropic/claude-3-haiku` - Claude 3 Haiku (быстрый)

### Google модели
- `google/gemini-pro` - Gemini Pro
- `google/gemini-pro-vision` - Gemini Pro Vision

### Meta модели
- `meta-llama/llama-3-70b-instruct` - Llama 3 70B
- `meta-llama/llama-3-8b-instruct` - Llama 3 8B

### Другие модели
- `mistralai/mistral-large` - Mistral Large
- `deepseek/deepseek-chat` - DeepSeek Chat
- `perplexity/pplx-70b-online` - Perplexity Online
- И многие другие...

**Полный список моделей:** https://openrouter.ai/models

## Использование в проекте

### Выбор провайдера в интерфейсе

После настройки API ключа, OpenRouter появится в списке доступных провайдеров в интерфейсе приложения. Выберите "OpenRouter" из выпадающего списка.

### Модель по умолчанию

По умолчанию используется модель `openai/gpt-4o`. Вы можете изменить модель по умолчанию в файле `backend/server.py`:

```python
class OpenRouterProvider(AIProvider):
    def __init__(self, api_key=None):
        # ...
        self.default_model = "openai/gpt-4o"  # Измените здесь
```

### Выбор модели через API

Вы можете указать конкретную модель при отправке запроса, добавив параметр `model`:

```javascript
// В frontend/script.js или через API
const response = await api.streamMessage(
    "Ваш вопрос",
    "openrouter",
    {
        temperature: 0.7,
        maxTokens: 2000,
        model: "anthropic/claude-3-opus"  // Указать конкретную модель
    }
);
```

## Структура интеграции

### Backend (server.py)

Класс `OpenRouterProvider` реализован в файле `backend/server.py`:

```python
class OpenRouterProvider(AIProvider):
    """OpenRouter AI Provider (using OpenAI-compatible API)"""
    
    def __init__(self, api_key=None):
        # Инициализация клиента с базовым URL OpenRouter
        self.client = openai.OpenAI(
            api_key=self.api_key,
            base_url="https://openrouter.ai/api/v1",
            default_headers={
                "HTTP-Referer": os.getenv('OPENROUTER_APP_URL', '...'),
                "X-Title": os.getenv('OPENROUTER_APP_NAME', 'AI Assistant')
            }
        )
```

### Frontend (script.js)

OpenRouter добавлен в список провайдеров:

```javascript
const providers = {
    // ...
    openrouter: { name: 'OpenRouter', model: 'openai/gpt-4o' }
};
```

## Обработка ошибок

Интеграция включает обработку следующих ошибок:

- **401 Unauthorized** - Неверный API ключ
- **402 Payment Required** - Недостаточно средств на балансе
- **429 Too Many Requests** - Превышен лимит запросов
- **Model Not Found** - Указанная модель недоступна

Все ошибки отображаются пользователю на русском языке с понятными сообщениями.

## Ценообразование

OpenRouter использует прозрачное ценообразование:
- Каждая модель имеет свою стоимость за токен
- Цены указаны на странице модели: https://openrouter.ai/models
- Баланс списывается автоматически при использовании
- Вы платите только за использованные токены

**Пример цен:**
- GPT-4o: ~$2.50 за 1M входных токенов
- Claude 3 Opus: ~$15 за 1M входных токенов
- GPT-3.5 Turbo: ~$0.50 за 1M входных токенов

## Преимущества использования OpenRouter

1. **Единый баланс** - не нужно управлять балансами для каждого провайдера отдельно
2. **Гибкость** - легко переключаться между моделями
3. **Прозрачность** - видно стоимость каждой модели
4. **Удобство** - один API для всех моделей
5. **Надежность** - автоматическое переключение между провайдерами при сбоях

## Примеры использования

### Пример 1: Использование GPT-4 через OpenRouter

```python
# В Python коде
provider = OpenRouterProvider()
response = provider.generate(
    "Привет! Как дела?",
    model="openai/gpt-4o",
    temperature=0.7
)
```

### Пример 2: Использование Claude через OpenRouter

```python
provider = OpenRouterProvider()
response = provider.generate(
    "Объясни квантовую физику",
    model="anthropic/claude-3-opus",
    temperature=0.8
)
```

### Пример 3: Стриминг ответа

```python
provider = OpenRouterProvider()
for chunk in provider.stream(
    "Расскажи историю",
    model="openai/gpt-4o"
):
    print(chunk, end='', flush=True)
```

## Дополнительные ресурсы

- **Документация OpenRouter:** https://openrouter.ai/docs
- **Список моделей:** https://openrouter.ai/models
- **Управление ключами:** https://openrouter.ai/keys
- **Пополнение баланса:** https://openrouter.ai/credits
- **Статистика использования:** https://openrouter.ai/activity

## Устранение неполадок

### Проблема: "OpenRouter API key not configured"

**Решение:**
1. Проверьте, что переменная `OPENROUTER_API_KEY` установлена в `.env` файле
2. Для Railway: убедитесь, что переменная добавлена в настройках проекта
3. Перезапустите сервер после добавления переменной

### Проблема: "Недостаточно средств на балансе"

**Решение:**
1. Перейдите на https://openrouter.ai/credits
2. Пополните баланс
3. Убедитесь, что баланс достаточен для выбранной модели

### Проблема: "Модель не найдена"

**Решение:**
1. Проверьте правильность названия модели на https://openrouter.ai/models
2. Убедитесь, что модель доступна в вашем регионе
3. Попробуйте другую модель

### Проблема: "Превышен лимит запросов"

**Решение:**
1. Подождите несколько минут
2. Проверьте лимиты на https://openrouter.ai/activity
3. Рассмотрите возможность обновления плана

## Поддержка

Если у вас возникли проблемы с интеграцией:

1. Проверьте логи сервера для детальной информации об ошибке
2. Убедитесь, что API ключ правильный и активен
3. Проверьте баланс на OpenRouter
4. Обратитесь к документации OpenRouter: https://openrouter.ai/docs

## Заключение

OpenRouter предоставляет удобный способ доступа к множеству AI-моделей через единый API. Интеграция проста и не требует изменений в основной логике приложения - просто добавьте API ключ и начните использовать любую доступную модель!
