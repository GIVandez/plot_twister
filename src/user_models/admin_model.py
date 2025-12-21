from typing import Dict, Optional
from database.repository import DatabaseRepository

from database.base import engine
from sqlalchemy.orm import sessionmaker
from database.models import User

class AdminModel:
    def __init__(self):
        self.db = DatabaseRepository()
    
    def new_user(self, user_info: Dict) -> bool:
        """
        Проверяет отсутствие логина пользователя в таблице user, 
        в случае успеха создает новую запись о пользователе
        
        Args:
            user_info: информация о пользователе {username: str, password: str, email: str}
        
        Returns:
            success: bool - успешность операции
        """
        username = user_info.get('username')
        password = user_info.get('password')
        email = user_info.get('email')
        
        if not username or not password:
            return False
        
        # Проверяем наличие учетной записи
        if self.db.user_exist(username):
            return False
        
        # Создаем новую учетную запись
        return self.db.create_user(username, password, email)
    
    def give_admin_role(self, user_id: int) -> bool:
        """
        Выдает пользователю роль администратора
        
        Args:
            user_id: id пользователя
        
        Returns:
            success: bool - успешность операции
        """
        # Получаем логин пользователя по ID
        username = self._get_username_by_id(user_id)
        if not username:
            return False
        
        # Обновляем роль пользователя
        return self.db.update_user_info(username, role='admin')
    
    def remove_admin_role(self, user_id: int) -> bool:
        """
        Отнимает у пользователя роль администратора
        
        Args:
            user_id: id пользователя
        
        Returns:
            success: bool - успешность операции
        """
        # Получаем логин пользователя по ID
        username = self._get_username_by_id(user_id)
        if not username:
            return False
        
        # Обновляем роль пользователя
        return self.db.update_user_info(username, role='user')
    
    def edit_user_info(self, user_info: Dict) -> bool:
        """
        Редактирует данные о пользователе
        
        Args:
            user_info: информация о пользователе {username: str, password: str, email: str}
        
        Returns:
            success: bool - успешность операции
        """
        username = user_info.get('username')
        if not username:
            return False
        
        # Проверяем наличие учетной записи
        if not self.db.user_exist(username):
            return False
        
        password = user_info.get('password')
        email = user_info.get('email')
        
        # Обновляем информацию о пользователе
        return self.db.update_user_info(username, password=password, email=email)
    
    def delete_user(self, username: str) -> bool:
        """
        Удаляет запись о пользователе из таблицы user и всех его проектах
        
        Args:
            username: логин пользователя
        
        Returns:
            success: bool - успешность операции
        """
        # Проверяем наличие учетной записи
        if not self.db.user_exist(username):
            return False
        
        # Удаляем пользователя (каскадное удаление через БД)
        return self.db.delete_user(username)
    
    def _get_username_by_id(self, user_id: int) -> Optional[str]:
        """Вспомогательный метод для получения логина пользователя по ID"""
        # Нужно добавить метод в репозиторий или использовать сессию напрямую
        # Пока используем простой подход через сессию
        
        Session = sessionmaker(bind=engine)
        session = Session()
        try:
            user = session.query(User).filter(User.id == user_id).first()
            return user.login if user else None
        finally:
            session.close()