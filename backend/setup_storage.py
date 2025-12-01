#!/usr/bin/env python3
"""
Интерактивный скрипт для настройки Yandex Object Storage
"""

import os
import sys

def create_env_file():
    """Создает или обновляет файл .env"""
    env_file = os.path.join(os.path.dirname(__file__), '.env')
    env_example = os.path.join(os.path.dirname(__file__), '.env.example')
    
    # Проверяем, существует ли .env
    env_exists = os.path.exists(env_file)
    
    if env_exists:
        print(f"\n⚠ Файл .env уже существует: {env_file}")
        response = input("Перезаписать? (y/N): ").strip().lower()
        if response != 'y':
            print("Отменено.")
            return False
    
    print("\n" + "=" * 60)
    print("Настройка Yandex Object Storage")
    print("=" * 60)
    print("\nВам понадобятся:")
    print("1. Access Key ID (из Yandex Cloud Console)")
    print("2. Secret Access Key (из Yandex Cloud Console)")
    print("3. Имя бакета (bucket name)")
    print("\nЕсли у вас еще нет ключей, следуйте инструкции:")
    print("  backend/YANDEX_STORAGE_SETUP.md")
    print("\n" + "-" * 60)
    
    # Собираем значения
    endpoint = input("\nEndpoint URL [https://storage.yandexcloud.net]: ").strip()
    if not endpoint:
        endpoint = "https://storage.yandexcloud.net"
    
    access_key = input("Access Key ID: ").strip()
    if not access_key:
        print("✗ Access Key ID обязателен!")
        return False
    
    secret_key = input("Secret Access Key: ").strip()
    if not secret_key:
        print("✗ Secret Access Key обязателен!")
        return False
    
    bucket = input("Имя бакета: ").strip()
    if not bucket:
        print("✗ Имя бакета обязательно!")
        return False
    
    region = input("Регион [ru-central1]: ").strip()
    if not region:
        region = "ru-central1"
    
    # Читаем существующий .env.example для сохранения других переменных
    env_vars = {}
    if os.path.exists(env_example):
        with open(env_example, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key = line.split('=', 1)[0].strip()
                    value = line.split('=', 1)[1].strip()
                    env_vars[key] = value
    
    # Обновляем значения для Yandex Storage
    env_vars['YANDEX_STORAGE_ENDPOINT'] = endpoint
    env_vars['YANDEX_STORAGE_ACCESS_KEY'] = access_key
    env_vars['YANDEX_STORAGE_SECRET_KEY'] = secret_key
    env_vars['YANDEX_STORAGE_BUCKET'] = bucket
    env_vars['YANDEX_STORAGE_REGION'] = region
    
    # Читаем существующий .env если есть, чтобы сохранить другие настройки
    if env_exists:
        with open(env_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key = line.split('=', 1)[0].strip()
                    if key not in ['YANDEX_STORAGE_ENDPOINT', 'YANDEX_STORAGE_ACCESS_KEY', 
                                   'YANDEX_STORAGE_SECRET_KEY', 'YANDEX_STORAGE_BUCKET', 
                                   'YANDEX_STORAGE_REGION']:
                        value = line.split('=', 1)[1].strip()
                        env_vars[key] = value
    
    # Записываем .env файл
    try:
        with open(env_file, 'w', encoding='utf-8') as f:
            # Записываем комментарии из примера
            if os.path.exists(env_example):
                with open(env_example, 'r', encoding='utf-8') as example:
                    in_yandex_section = False
                    for line in example:
                        if 'Yandex Object Storage' in line:
                            in_yandex_section = True
                        if in_yandex_section and line.strip() and not line.strip().startswith('#'):
                            if 'YANDEX_STORAGE' not in line:
                                in_yandex_section = False
                        
                        if not in_yandex_section or 'YANDEX_STORAGE' not in line:
                            if 'YANDEX_STORAGE' in line and not line.strip().startswith('#'):
                                continue
                            f.write(line)
            
            # Записываем переменные Yandex Storage
            f.write("\n# Yandex Object Storage (настроено через setup_storage.py)\n")
            f.write(f"YANDEX_STORAGE_ENDPOINT={env_vars['YANDEX_STORAGE_ENDPOINT']}\n")
            f.write(f"YANDEX_STORAGE_ACCESS_KEY={env_vars['YANDEX_STORAGE_ACCESS_KEY']}\n")
            f.write(f"YANDEX_STORAGE_SECRET_KEY={env_vars['YANDEX_STORAGE_SECRET_KEY']}\n")
            f.write(f"YANDEX_STORAGE_BUCKET={env_vars['YANDEX_STORAGE_BUCKET']}\n")
            f.write(f"YANDEX_STORAGE_REGION={env_vars['YANDEX_STORAGE_REGION']}\n")
        
        print(f"\n✓ Файл .env создан/обновлен: {env_file}")
        print("\nТеперь запустите проверку:")
        print("  python3 test_yandex_storage.py")
        return True
        
    except Exception as e:
        print(f"\n✗ Ошибка при создании файла: {e}")
        return False

def main():
    """Основная функция"""
    print("\n" + "=" * 60)
    print("Интерактивная настройка Yandex Object Storage")
    print("=" * 60)
    
    if create_env_file():
        print("\n" + "=" * 60)
        print("Настройка завершена!")
        print("=" * 60)
        
        # Предлагаем запустить проверку
        response = input("\nЗапустить проверку подключения? (Y/n): ").strip().lower()
        if response != 'n':
            print("\nЗапуск проверки...\n")
            os.system(f"{sys.executable} test_yandex_storage.py")
    else:
        print("\nНастройка отменена или завершилась с ошибкой.")
        return 1
    
    return 0

if __name__ == '__main__':
    sys.exit(main())
