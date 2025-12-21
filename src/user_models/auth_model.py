import secrets
from typing import Optional
from database.repository import DatabaseRepository


class AuthModel:
    def __init__(self):
        self.db = DatabaseRepository()
    
    def login(self, username: str, password: str) -> int:
        """
        Проверяет логин и пароль пользователя в таблице user
        
        Args:
            username: логин пользователя
            password: пароль пользователя
        
        Returns:
            auth_token: int - токен авторизации в случае успеха (положительное число >= 1000)
            status: int - статус ошибки (1 - пользователь не найден, 2 - неверный пароль)
        """
        # Проверяем существование пользователя
        if not self.db.user_exist(username):
            return 1  # Пользователь не найден
        
        # Получаем информацию о пользователе
        user_info = self.db.read_user_info(username)
        if not user_info:
            return 1  # Пользователь не найден
        
        # Сравниваем пароли
        if user_info['password'] != password:
            return 2  # Неверный пароль
        
        # Генерируем auth_token (используем хэш для простоты)
        # Убеждаемся, что токен >= 1000, чтобы отличать от status кодов 1 и 2
        auth_token = hash(username + password + secrets.token_hex(8))
        auth_token = abs(auth_token)
        # Ограничиваем до разумного размера и убеждаемся, что >= 1000
        auth_token = (auth_token % (10 ** 10 - 1000)) + 1000
        
        return auth_token
    
    def register(self, username: str, password: str, email: str) -> Optional[int]:
        """
        Проверяет отсутствие логина пользователя в таблице user, 
        в случае успеха создает новую запись о пользователе
        
        Args:
            username: логин пользователя
            password: пароль пользователя
            email: email пользователя
        
        Returns:
            auth_token: int - токен авторизации в случае успеха
            None - если учетная запись уже существует
        """
        # Проверяем наличие учетной записи
        if self.db.user_exist(username):
            return None  # Учетная запись уже существует
        
        # Создаем новую учетную запись
        success = self.db.create_user(username, password, email)
        if not success:
            return None
        
        # Генерируем auth_token
        auth_token = hash(username + password + secrets.token_hex(8))
        auth_token = abs(auth_token)
        auth_token = auth_token % (10 ** 10)
        
        return auth_token