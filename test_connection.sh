#!/bin/bash
# Быстрый тест подключения Frontend ↔ Backend

BACKEND_URL="${1:-http://localhost:8000}"
API_PATH="${2:-/api}"

echo "🔌 Тест подключения Frontend ↔ Backend"
echo "Backend URL: ${BACKEND_URL}${API_PATH}"
echo ""

# Проверка наличия curl
if ! command -v curl &> /dev/null; then
    echo "❌ curl не установлен. Установите curl для использования этого скрипта."
    exit 1
fi

# Функция для проверки ответа
check_response() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    
    echo "📡 Тест: $name"
    echo "   URL: $url"
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d '{"message":"Тест","provider":"openai","temperature":0.7,"maxTokens":100}')
    else
        response=$(curl -s -w "\n%{http_code}" "$url")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "200" ]; then
        echo "   ✅ Успешно (HTTP $http_code)"
        echo "   Ответ: $(echo "$body" | head -c 100)..."
        return 0
    else
        echo "   ❌ Ошибка (HTTP $http_code)"
        echo "   Ответ: $body"
        return 1
    fi
    echo ""
}

# Тест 1: Health Check
check_response "Health Check" "${BACKEND_URL}${API_PATH}/health" "GET"
health_result=$?

echo ""

# Тест 2: Providers
check_response "Providers" "${BACKEND_URL}${API_PATH}/providers" "GET"
providers_result=$?

echo ""

# Тест 3: Chat
check_response "Chat" "${BACKEND_URL}${API_PATH}/chat" "POST"
chat_result=$?

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "📊 Результаты:"
echo ""

if [ $health_result -eq 0 ]; then
    echo "✅ Health Check: ПРОЙДЕН"
else
    echo "❌ Health Check: ПРОВАЛЕН"
fi

if [ $providers_result -eq 0 ]; then
    echo "✅ Providers: ПРОЙДЕН"
else
    echo "❌ Providers: ПРОВАЛЕН"
fi

if [ $chat_result -eq 0 ]; then
    echo "✅ Chat: ПРОЙДЕН"
else
    echo "⚠️  Chat: Может быть ошибка API ключа (это нормально для теста)"
fi

echo ""
total=$((health_result + providers_result + chat_result))

if [ $total -eq 0 ]; then
    echo "🎉 Все тесты пройдены! Frontend и Backend общаются корректно."
    exit 0
elif [ $health_result -eq 0 ]; then
    echo "⚠️  Сервер работает, но некоторые тесты не пройдены."
    echo "   Проверьте настройки API ключей."
    exit 1
else
    echo "❌ Сервер недоступен. Проверьте:"
    echo "   • Запущен ли backend сервер"
    echo "   • Правильно ли указан URL"
    exit 2
fi
