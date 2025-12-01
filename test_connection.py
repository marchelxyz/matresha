#!/usr/bin/env python3
"""
Скрипт для проверки связи между Frontend и Backend
Использование: python test_connection.py [--url URL] [--api-path PATH]
"""

import sys
import json
import argparse
import requests
from urllib.parse import urljoin

def print_header(text):
    """Красивый вывод заголовка"""
    print(f"\n{'='*60}")
    print(f"  {text}")
    print(f"{'='*60}\n")

def print_success(text):
    """Вывод успешного результата"""
    print(f"✅ {text}")

def print_error(text):
    """Вывод ошибки"""
    print(f"❌ {text}")

def print_warning(text):
    """Вывод предупреждения"""
    print(f"⚠️  {text}")

def print_info(text):
    """Вывод информации"""
    print(f"ℹ️  {text}")

def test_health(base_url):
    """Тест health check endpoint"""
    print_header("1. Health Check")
    url = urljoin(base_url, "/health")
    print_info(f"Проверка: {url}")
    
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            print_success(f"Сервер отвечает! Статус: {data.get('status', 'unknown')}")
            print_info(f"Версия: {data.get('version', 'unknown')}")
            print_info(f"Время: {data.get('timestamp', 'unknown')}")
            return True
        else:
            print_error(f"HTTP {response.status_code}: {response.text}")
            return False
    except requests.exceptions.ConnectionError:
        print_error("Не удалось подключиться к серверу")
        print_info("Проверьте:")
        print_info("  • Запущен ли backend сервер")
        print_info("  • Правильно ли указан URL")
        return False
    except requests.exceptions.Timeout:
        print_error("Превышено время ожидания")
        return False
    except Exception as e:
        print_error(f"Ошибка: {str(e)}")
        return False

def test_providers(base_url):
    """Тест providers endpoint"""
    print_header("2. Providers Check")
    url = urljoin(base_url, "/providers")
    print_info(f"Проверка: {url}")
    
    try:
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            data = response.json()
            if data.get('success'):
                providers = data.get('data', {}).get('providers', [])
                status = data.get('data', {}).get('status', {})
                
                if providers:
                    print_success(f"Найдено {len(providers)} провайдеров:")
                    for provider in providers:
                        print_info(f"  • {provider}")
                else:
                    print_warning("Провайдеры не настроены (нет API ключей)")
                    print_info("Это нормально, если вы еще не настроили API ключи")
                
                # Показываем статус каждого провайдера
                print("\nСтатус провайдеров:")
                for name, info in status.items():
                    if info.get('available'):
                        print_success(f"  {name}: настроен")
                    else:
                        print_warning(f"  {name}: не настроен ({info.get('env_var', 'N/A')})")
                
                return True
            else:
                print_error(f"Ошибка в ответе: {data.get('error', 'unknown')}")
                return False
        else:
            print_error(f"HTTP {response.status_code}: {response.text}")
            return False
    except Exception as e:
        print_error(f"Ошибка: {str(e)}")
        return False

def test_chat(base_url):
    """Тест chat endpoint"""
    print_header("3. Chat Endpoint Test")
    url = urljoin(base_url, "/chat")
    print_info(f"Проверка: {url}")
    
    test_message = {
        "message": "Привет! Это тестовое сообщение.",
        "provider": "openai",
        "temperature": 0.7,
        "maxTokens": 100
    }
    
    try:
        response = requests.post(
            url,
            json=test_message,
            headers={"Content-Type": "application/json"},
            timeout=30
        )
        
        if response.status_code == 200:
            data = response.json()
            if data.get('success') and data.get('data', {}).get('response'):
                print_success("Сообщение отправлено и получен ответ!")
                response_text = data['data']['response']
                print_info(f"Ответ (первые 200 символов): {response_text[:200]}...")
                return True
            else:
                error_msg = data.get('error', 'Неизвестная ошибка')
                if 'API key not configured' in error_msg:
                    print_warning("Сервер работает, но API ключ не настроен")
                    print_info("Это нормально для теста подключения")
                    print_info("Для полной проверки настройте OPENAI_API_KEY в .env")
                    return True  # Считаем успехом, т.к. сервер отвечает
                else:
                    print_error(f"Ошибка в ответе: {error_msg}")
                    return False
        elif response.status_code == 400:
            data = response.json()
            error_msg = data.get('error', 'Bad Request')
            if 'API key not configured' in error_msg:
                print_warning("Сервер работает, но API ключ не настроен")
                print_info("Это нормально для теста подключения")
                return True
            else:
                print_error(f"Ошибка запроса: {error_msg}")
                return False
        else:
            print_error(f"HTTP {response.status_code}: {response.text}")
            return False
    except requests.exceptions.Timeout:
        print_error("Превышено время ожидания (30 секунд)")
        print_info("Возможно, API ключ не настроен или провайдер недоступен")
        return False
    except Exception as e:
        print_error(f"Ошибка: {str(e)}")
        return False

def test_cors(base_url):
    """Проверка CORS настроек"""
    print_header("4. CORS Check")
    print_info("Проверка CORS заголовков...")
    
    try:
        # Отправляем OPTIONS запрос для проверки CORS
        response = requests.options(
            base_url,
            headers={
                "Origin": "http://localhost:3000",
                "Access-Control-Request-Method": "POST"
            },
            timeout=5
        )
        
        cors_headers = {
            "Access-Control-Allow-Origin": response.headers.get("Access-Control-Allow-Origin"),
            "Access-Control-Allow-Methods": response.headers.get("Access-Control-Allow-Methods"),
            "Access-Control-Allow-Headers": response.headers.get("Access-Control-Allow-Headers")
        }
        
        if any(cors_headers.values()):
            print_success("CORS заголовки присутствуют:")
            for header, value in cors_headers.items():
                if value:
                    print_info(f"  {header}: {value}")
            return True
        else:
            print_warning("CORS заголовки не найдены")
            print_info("Это может быть проблемой, если фронтенд на другом домене")
            return True  # Не критично для теста
    except Exception as e:
        print_warning(f"Не удалось проверить CORS: {str(e)}")
        return True  # Не критично

def main():
    parser = argparse.ArgumentParser(description="Тест подключения Frontend ↔ Backend")
    parser.add_argument(
        "--url",
        default="http://localhost:8000",
        help="URL backend сервера (по умолчанию: http://localhost:8000)"
    )
    parser.add_argument(
        "--api-path",
        default="/api",
        help="Путь к API (по умолчанию: /api)"
    )
    
    args = parser.parse_args()
    
    base_url = urljoin(args.url.rstrip('/'), args.api_path.lstrip('/'))
    
    print_header("Тест подключения Frontend ↔ Backend")
    print_info(f"Backend URL: {base_url}")
    print_info(f"Начинаем тестирование...\n")
    
    results = []
    
    # Тест 1: Health Check
    results.append(("Health Check", test_health(base_url)))
    
    # Тест 2: Providers
    results.append(("Providers", test_providers(base_url)))
    
    # Тест 3: Chat
    results.append(("Chat", test_chat(base_url)))
    
    # Тест 4: CORS
    results.append(("CORS", test_cors(base_url)))
    
    # Итоги
    print_header("Результаты тестирования")
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ ПРОЙДЕН" if result else "❌ ПРОВАЛЕН"
        print(f"{status}: {test_name}")
    
    print(f"\nИтого: {passed}/{total} тестов пройдено")
    
    if passed == total:
        print_success("Все тесты пройдены! Frontend и Backend общаются корректно.")
        return 0
    elif passed > 0:
        print_warning("Некоторые тесты не пройдены. Проверьте настройки.")
        return 1
    else:
        print_error("Все тесты провалены. Проверьте подключение к серверу.")
        return 2

if __name__ == "__main__":
    sys.exit(main())
