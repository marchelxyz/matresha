# 🔧 Исправление ошибки OpenAI: "unexpected keyword argument 'proxies'"

## Проблема

При попытке использовать OpenAI API возникает ошибка:
```
TypeError: Client.__init__() got an unexpected keyword argument 'proxies'
```

Это происходит из-за несовместимости версий библиотек `openai` и `httpx`.

## ✅ Решение

### Вариант 1: Обновление зависимостей (Рекомендуется)

Файл `requirements.txt` уже обновлен. Теперь нужно переустановить зависимости:

#### Для локальной разработки:

```bash
cd backend
pip install --upgrade -r requirements.txt
```

Или принудительно переустановить пакеты:

```bash
pip install --upgrade --force-reinstall openai httpx
pip install -r requirements.txt
```

#### Для Railway (продакшн):

1. **Автоматическое обновление:**
   - Railway автоматически переустановит зависимости при следующем деплое
   - Просто сделайте коммит и пуш изменений:
   ```bash
   git add backend/requirements.txt
   git commit -m "Fix OpenAI httpx compatibility"
   git push
   ```

2. **Ручное обновление (если нужно):**
   - Перейдите в ваш проект на Railway
   - Откройте раздел **Deployments**
   - Нажмите **Redeploy** (Переразвернуть)

### Вариант 2: Явное указание версий

Если автоматическое обновление не помогло, можно зафиксировать конкретные версии:

Отредактируйте `backend/requirements.txt`:

```txt
openai==1.54.0
httpx==0.27.0
httpcore==1.0.5
```

Затем переустановите:
```bash
pip install --upgrade -r requirements.txt
```

## 🔍 Проверка исправления

После обновления проверьте:

1. **Версии пакетов:**
   ```bash
   pip show openai httpx
   ```

   Должно показать:
   ```
   Name: openai
   Version: 1.54.0 (или выше)
   
   Name: httpx
   Version: 0.27.0 (или выше, но < 1.0.0)
   ```

2. **Тест API:**
   ```bash
   curl http://localhost:8000/api/providers
   ```

3. **Тест отправки сообщения:**
   ```bash
   curl -X POST http://localhost:8000/api/chat \
     -H "Content-Type: application/json" \
     -d '{
       "message": "Привет",
       "provider": "openai"
     }'
   ```

## 📋 Что было изменено

В файле `backend/requirements.txt`:

**Было:**
```txt
openai==1.12.0
```

**Стало:**
```txt
openai>=1.54.0  # Updated to fix httpx compatibility issue
httpx>=0.27.0,<1.0.0  # Compatible version for OpenAI and Groq
```

## 🚨 Если проблема сохраняется

1. **Очистите кэш pip:**
   ```bash
   pip cache purge
   pip install --upgrade --no-cache-dir -r requirements.txt
   ```

2. **Проверьте конфликты зависимостей:**
   ```bash
   pip check
   ```

3. **Создайте чистое виртуальное окружение:**
   ```bash
   python -m venv venv_new
   source venv_new/bin/activate  # Linux/Mac
   # или
   venv_new\Scripts\activate  # Windows
   pip install -r requirements.txt
   ```

4. **Для Railway - проверьте логи:**
   - Перейдите в раздел **Deployments**
   - Откройте последний деплой
   - Проверьте логи установки зависимостей

## 📚 Дополнительная информация

- [OpenAI Python SDK Releases](https://github.com/openai/openai-python/releases)
- [httpx Documentation](https://www.python-httpx.org/)
- [Issue: OpenAI httpx compatibility](https://github.com/openai/openai-python/issues)

---

**После исправления перезапустите сервер и проверьте работу!** ✅
