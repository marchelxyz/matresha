#!/usr/bin/env python3
"""
Скрипт для проверки подключения к Yandex Object Storage
"""

import os
import sys
from dotenv import load_dotenv

# Загружаем переменные окружения
load_dotenv()

def check_env_variables():
    """Проверяет наличие необходимых переменных окружения"""
    print("=" * 60)
    print("Проверка переменных окружения")
    print("=" * 60)
    
    required_vars = {
        'YANDEX_STORAGE_ENDPOINT': os.getenv('YANDEX_STORAGE_ENDPOINT'),
        'YANDEX_STORAGE_ACCESS_KEY': os.getenv('YANDEX_STORAGE_ACCESS_KEY'),
        'YANDEX_STORAGE_SECRET_KEY': os.getenv('YANDEX_STORAGE_SECRET_KEY'),
        'YANDEX_STORAGE_BUCKET': os.getenv('YANDEX_STORAGE_BUCKET'),
        'YANDEX_STORAGE_REGION': os.getenv('YANDEX_STORAGE_REGION', 'ru-central1')
    }
    
    all_set = True
    for var_name, var_value in required_vars.items():
        if var_value:
            # Скрываем секретные ключи
            if 'SECRET' in var_name or 'ACCESS_KEY' in var_name:
                display_value = f"{var_value[:4]}...{var_value[-4:]}" if len(var_value) > 8 else "***"
            else:
                display_value = var_value
            print(f"✓ {var_name}: {display_value}")
        else:
            print(f"✗ {var_name}: НЕ УСТАНОВЛЕНА")
            all_set = False
    
    return all_set, required_vars

def test_storage_connection():
    """Тестирует подключение к хранилищу"""
    print("\n" + "=" * 60)
    print("Тестирование подключения к Yandex Object Storage")
    print("=" * 60)
    
    try:
        from storage import storage
        
        if not storage.enabled:
            print("✗ Хранилище не включено (отсутствуют необходимые переменные окружения)")
            return False
        
        print(f"✓ Хранилище инициализировано")
        print(f"  Endpoint: {storage.endpoint_url}")
        print(f"  Bucket: {storage.bucket_name}")
        print(f"  Region: {storage.region}")
        
        # Проверяем подключение к бакету
        print("\nПроверка доступа к бакету...")
        try:
            storage.s3_client.head_bucket(Bucket=storage.bucket_name)
            print(f"✓ Бакет '{storage.bucket_name}' доступен")
        except Exception as e:
            print(f"✗ Ошибка доступа к бакету: {e}")
            return False
        
        # Тестовая загрузка файла
        print("\nТестовая загрузка файла...")
        test_content = b"Test file content for Yandex Storage connection test"
        test_filename = "test_connection.txt"
        
        upload_result = storage.upload_file(
            file_data=test_content,
            filename=test_filename,
            content_type="text/plain",
            folder="test"
        )
        
        if upload_result:
            print(f"✓ Файл успешно загружен")
            print(f"  Object Key: {upload_result['object_key']}")
            print(f"  URL: {upload_result['url']}")
            print(f"  Size: {upload_result['size']} bytes")
            
            # Удаляем тестовый файл
            print("\nУдаление тестового файла...")
            if storage.delete_file(upload_result['object_key']):
                print("✓ Тестовый файл удален")
            else:
                print("⚠ Не удалось удалить тестовый файл (можно удалить вручную)")
            
            return True
        else:
            print("✗ Не удалось загрузить тестовый файл")
            return False
            
    except ImportError as e:
        print(f"✗ Ошибка импорта: {e}")
        print("  Убедитесь, что установлены все зависимости: pip install -r requirements.txt")
        return False
    except Exception as e:
        print(f"✗ Ошибка подключения: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Основная функция"""
    print("\n" + "=" * 60)
    print("Проверка подключения Yandex Object Storage")
    print("=" * 60 + "\n")
    
    # Проверяем переменные окружения
    env_ok, env_vars = check_env_variables()
    
    if not env_ok:
        print("\n" + "=" * 60)
        print("⚠ ВНИМАНИЕ: Не все переменные окружения установлены!")
        print("=" * 60)
        print("\nДля настройки хранилища:")
        print("1. Создайте файл .env в папке backend/ (скопируйте из .env.example)")
        print("2. Заполните следующие переменные:")
        print("   - YANDEX_STORAGE_ENDPOINT=https://storage.yandexcloud.net")
        print("   - YANDEX_STORAGE_ACCESS_KEY=ваш-access-key-id")
        print("   - YANDEX_STORAGE_SECRET_KEY=ваш-secret-access-key")
        print("   - YANDEX_STORAGE_BUCKET=имя-вашего-бакета")
        print("   - YANDEX_STORAGE_REGION=ru-central1")
        print("\nПодробная инструкция: backend/YANDEX_STORAGE_SETUP.md")
        return 1
    
    # Тестируем подключение
    connection_ok = test_storage_connection()
    
    print("\n" + "=" * 60)
    if connection_ok:
        print("✓ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ УСПЕШНО!")
        print("  Yandex Object Storage готов к использованию")
    else:
        print("✗ ОБНАРУЖЕНЫ ПРОБЛЕМЫ")
        print("  Проверьте настройки и попробуйте снова")
    print("=" * 60 + "\n")
    
    return 0 if connection_ok else 1

if __name__ == '__main__':
    sys.exit(main())
