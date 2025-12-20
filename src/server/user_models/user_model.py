from typing import Optional, Dict, List
from database.repository import DatabaseRepository


class UserModel:
    def __init__(self):
        self.db = DatabaseRepository()
    
    def get_user_info(self, username: str) -> Optional[Dict]:
        """
        Получение информации о пользователе (email, псевдоним)
        
        Args:
            username: логин пользователя
        
        Returns:
            user_info: словарь с информацией о пользователе {username: str, password: str, email: str}
            None - если пользователь не найден
        """
        user_info = self.db.read_user_info(username)
        if not user_info:
            return None
        
        # Возвращаем информацию в формате, указанном в архитектуре
        return {
            'username': user_info['username'],
            'password': user_info['password'],
            'email': user_info.get('email', '')  # email может отсутствовать в БД
        }
    
    def get_user_projects(self, username: str) -> List[str]:
        """
        Получение списка проектов пользователя
        
        Args:
            username: логин пользователя
        
        Returns:
            user_projects: список названий проектов
        """
        projects = self.db.read_user_projects(username)
        # Возвращаем список названий проектов
        return [project['project_name'] for project in projects]
    
    def edit_user_info(self, user_info: Dict) -> bool:
        """
        Редактирование информации о пользователе
        
        Args:
            user_info: словарь с новой информацией о пользователе {username: str, password: str, email: str}
        
        Returns:
            success: bool - успешность операции
        """
        username = user_info.get('username')
        if not username:
            return False
        
        password = user_info.get('password')
        email = user_info.get('email')
        
        # Обновляем информацию о пользователе
        return self.db.update_user_info(username, password=password, email=email)
    
    def delete_user(self, username: str) -> bool:
        """
        Каскадно удаляет запись о пользователе и всех его проектах
        
        Args:
            username: логин пользователя
        
        Returns:
            success: bool - успешность операции
        """
        # Проверяем наличие учетной записи
        if not self.db.user_exist(username):
            return False
        
        # Удаляем пользователя
        return self.db.delete_user(username)
