"""
Yandex Object Storage integration
Использует S3-совместимый API через boto3
"""

import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, Dict
import boto3
from botocore.exceptions import ClientError
from werkzeug.utils import secure_filename


class YandexStorage:
    """Класс для работы с Yandex Object Storage"""
    
    def __init__(self):
        # Получаем настройки из переменных окружения
        self.endpoint_url = os.getenv('YANDEX_STORAGE_ENDPOINT', 'https://storage.yandexcloud.net')
        self.access_key_id = os.getenv('YANDEX_STORAGE_ACCESS_KEY')
        self.secret_access_key = os.getenv('YANDEX_STORAGE_SECRET_KEY')
        self.bucket_name = os.getenv('YANDEX_STORAGE_BUCKET', 'ai-assistant-files')
        self.region = os.getenv('YANDEX_STORAGE_REGION', 'ru-central1')
        
        # Проверяем, настроено ли хранилище
        self.enabled = bool(self.access_key_id and self.secret_access_key and self.bucket_name)
        
        if self.enabled:
            try:
                # Создаем S3 клиент для Yandex Object Storage
                self.s3_client = boto3.client(
                    's3',
                    endpoint_url=self.endpoint_url,
                    aws_access_key_id=self.access_key_id,
                    aws_secret_access_key=self.secret_access_key,
                    region_name=self.region
                )
                
                # Проверяем существование бакета
                self._ensure_bucket_exists()
            except Exception as e:
                print(f"WARNING: Failed to initialize Yandex Storage: {e}")
                self.enabled = False
                self.s3_client = None
        else:
            self.s3_client = None
            print("INFO: Yandex Object Storage not configured. Files will be processed in memory.")
    
    def _ensure_bucket_exists(self):
        """Проверяет существование бакета"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            print(f"✓ Бакет '{self.bucket_name}' доступен")
        except ClientError as e:
            error_code = e.response['Error']['Code']
            if error_code == '404':
                print(f"ERROR: Бакет '{self.bucket_name}' не найден!")
                print(f"      Создайте бакет в консоли Yandex Cloud:")
                print(f"      https://console.yandex.cloud/storage")
                print(f"      Или используйте команду:")
                print(f"      yc storage bucket create --name {self.bucket_name} --region {self.region}")
            elif error_code == '403':
                print(f"ERROR: Доступ запрещен к бакету '{self.bucket_name}'")
                print(f"      Проверьте права доступа сервисного аккаунта")
            else:
                print(f"ERROR: Не удалось проверить бакет: {e}")
                print(f"      Код ошибки: {error_code}")
    
    def upload_file(self, file_data: bytes, filename: str, content_type: str = None, 
                   folder: str = 'uploads') -> Optional[Dict]:
        """
        Загружает файл в хранилище
        
        Args:
            file_data: Данные файла (bytes)
            filename: Имя файла
            content_type: MIME тип файла
            folder: Папка в хранилище
            
        Returns:
            Dict с информацией о загруженном файле или None при ошибке
        """
        if not self.enabled:
            return None
        
        try:
            # Генерируем уникальное имя файла
            file_ext = os.path.splitext(filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_ext}"
            object_key = f"{folder}/{datetime.now().strftime('%Y/%m/%d')}/{unique_filename}"
            
            # Загружаем файл
            extra_args = {}
            if content_type:
                extra_args['ContentType'] = content_type
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=object_key,
                Body=file_data,
                **extra_args
            )
            
            # Генерируем публичную ссылку (действительна 7 дней)
            url = self.get_presigned_url(object_key, expires_in=604800)  # 7 дней
            
            return {
                'object_key': object_key,
                'filename': filename,
                'url': url,
                'size': len(file_data),
                'content_type': content_type
            }
        
        except Exception as e:
            print(f"ERROR: Failed to upload file to storage: {e}")
            return None
    
    def get_presigned_url(self, object_key: str, expires_in: int = 3600) -> Optional[str]:
        """
        Генерирует временную публичную ссылку на файл
        
        Args:
            object_key: Ключ объекта в хранилище
            expires_in: Время жизни ссылки в секундах (по умолчанию 1 час)
            
        Returns:
            URL или None при ошибке
        """
        if not self.enabled:
            return None
        
        try:
            url = self.s3_client.generate_presigned_url(
                'get_object',
                Params={
                    'Bucket': self.bucket_name,
                    'Key': object_key
                },
                ExpiresIn=expires_in
            )
            return url
        except Exception as e:
            print(f"ERROR: Failed to generate presigned URL: {e}")
            return None
    
    def delete_file(self, object_key: str) -> bool:
        """
        Удаляет файл из хранилища
        
        Args:
            object_key: Ключ объекта в хранилище
            
        Returns:
            True если успешно, False при ошибке
        """
        if not self.enabled:
            return False
        
        try:
            self.s3_client.delete_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            return True
        except Exception as e:
            print(f"ERROR: Failed to delete file from storage: {e}")
            return False
    
    def get_file_info(self, object_key: str) -> Optional[Dict]:
        """
        Получает информацию о файле
        
        Args:
            object_key: Ключ объекта в хранилище
            
        Returns:
            Dict с информацией о файле или None при ошибке
        """
        if not self.enabled:
            return None
        
        try:
            response = self.s3_client.head_object(
                Bucket=self.bucket_name,
                Key=object_key
            )
            return {
                'size': response.get('ContentLength', 0),
                'content_type': response.get('ContentType', ''),
                'last_modified': response.get('LastModified'),
                'etag': response.get('ETag', '')
            }
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                return None
            print(f"ERROR: Failed to get file info: {e}")
            return None


# Глобальный экземпляр хранилища
storage = YandexStorage()
