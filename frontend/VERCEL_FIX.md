# Решение проблем с Vercel

## Если Vercel выдает ошибки, попробуйте следующие решения:

### Вариант 1: Удалить vercel.json (самый простой)

Для статических HTML файлов Vercel может работать без `vercel.json`. Просто удалите файл:

```bash
rm frontend/vercel.json
```

Vercel автоматически определит статические файлы и задеплоит их.

### Вариант 2: Упростить package.json

Если Vercel ругается на build команду, обновите `package.json`:

```json
{
  "scripts": {
    "build": ""
  }
}
```

Или удалите секцию `scripts` полностью.

### Вариант 3: Настройки в Vercel Dashboard

В настройках проекта Vercel:

1. **Framework Preset**: выберите `Other` или `Vite`
2. **Root Directory**: обязательно укажите `frontend`
3. **Build Command**: оставьте **ПУСТЫМ** или удалите
4. **Output Directory**: оставьте **ПУСТЫМ** или укажите `.`
5. **Install Command**: можно оставить `npm install` или удалить

### Вариант 4: Минимальный vercel.json

Если нужны только CORS заголовки, используйте минимальную версию:

```json
{}
```

Или вообще удалите файл.

### Вариант 5: Использовать _redirects файл

Создайте файл `frontend/_redirects`:

```
/*    /index.html   200
```

Это для SPA роутинга, если нужно.

## Частые ошибки Vercel:

1. **"No Build Output"** - удалите build команду или оставьте пустой
2. **"Build Command Failed"** - убедитесь, что build команда пустая или отсутствует
3. **"Framework Not Detected"** - выберите "Other" в настройках
4. **"Root Directory Not Found"** - проверьте, что указали `frontend` в Root Directory

## Рекомендуемая конфигурация для статических файлов:

В Vercel Dashboard:
- Root Directory: `frontend`
- Framework: `Other`
- Build Command: (пусто)
- Output Directory: (пусто)
- Install Command: (можно удалить)

Файлы в `frontend/`:
- `index.html` ✅
- `styles.css` ✅
- `script.js` ✅
- `api.js` ✅
- `telegram-config.js` ✅
- `manifest.json` ✅
- `vercel.json` (можно удалить) ⚠️
- `package.json` (можно удалить) ⚠️
