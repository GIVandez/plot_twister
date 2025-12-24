"""
Модульные тесты для UserModel
"""
import sys
import os
import pytest
from unittest.mock import Mock, MagicMock

# Добавляем путь к src в PYTHONPATH
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from user_models.user_model import UserModel


class TestUserModel:
    """Тесты для класса UserModel"""
    
    @pytest.fixture
    def user_model(self):
        """Фикстура для создания экземпляра UserModel с mock БД"""
        model = UserModel()
        model.db = Mock()
        return model
    
    # ===== метод get_user_info =====
    
    def test_m1_get_existing_user_info(self, user_model):
        """
        Тест M1: Получение информации о существующем пользователе
        Позитивный тест
        """
        # Arrange
        username = "existing_user"
        user_model.db.read_user_info.return_value = {
            'username': 'existing_user',
            'password': 'password123',
            'email': 'user@example.com'
        }
        
        # Act
        result = user_model.get_user_info(username)
        
        # Assert
        assert result is not None
        assert isinstance(result, dict)
        assert result['username'] == 'existing_user'
        assert 'password' in result
        assert 'email' in result
        user_model.db.read_user_info.assert_called_once_with(username)
    
    def test_m2_get_non_existing_user_info(self, user_model):
        """
        Тест M2: Получение информации о несуществующем пользователе
        Негативный тест
        """
        # Arrange
        username = "non_existing_user"
        user_model.db.read_user_info.return_value = None
        
        # Act
        result = user_model.get_user_info(username)
        
        # Assert
        assert result is None
        user_model.db.read_user_info.assert_called_once_with(username)
    
    def test_m3_get_user_info_without_email(self, user_model):
        """
        Тест M3: Получение информации о пользователе без email
        Позитивный тест
        """
        # Arrange
        username = "user_without_email"
        user_model.db.read_user_info.return_value = {
            'username': 'user_without_email',
            'password': 'password123'
        }
        
        # Act
        result = user_model.get_user_info(username)
        
        # Assert
        assert result is not None
        assert isinstance(result, dict)
        assert result['email'] == ''
    
    # ===== метод get_user_projects =====
    
    def test_m4_get_projects_for_user_with_projects(self, user_model):
        """
        Тест M4: Получение списка проектов существующего пользователя
        Позитивный тест
        """
        # Arrange
        username = "user_with_projects"
        user_model.db.read_user_projects.return_value = [
            {'project_id': 1, 'project_name': 'Project 1', 'owner_username': username},
            {'project_id': 2, 'project_name': 'Project 2', 'owner_username': username}
        ]
        
        # Act
        result = user_model.get_user_projects(username)
        
        # Assert
        assert isinstance(result, list)
        assert len(result) == 2
        assert result == ['Project 1', 'Project 2']
        user_model.db.read_user_projects.assert_called_once_with(username)
    
    def test_m5_get_projects_for_user_without_projects(self, user_model):
        """
        Тест M5: Получение списка проектов пользователя без проектов
        Позитивный тест
        """
        # Arrange
        username = "user_without_projects"
        user_model.db.read_user_projects.return_value = []
        
        # Act
        result = user_model.get_user_projects(username)
        
        # Assert
        assert isinstance(result, list)
        assert len(result) == 0
    
    # ===== метод edit_user_info =====
    
    def test_m6_edit_user_info_success(self, user_model):
        """
        Тест M6: Успешное редактирование информации о пользователе
        Позитивный тест
        """
        # Arrange
        user_info = {
            "username": "existing_user",
            "password": "new_password",
            "email": "new_email@example.com"
        }
        user_model.db.update_user_info.return_value = True
        
        # Act
        result = user_model.edit_user_info(user_info)
        
        # Assert
        assert result is True
        user_model.db.update_user_info.assert_called_once_with(
            "existing_user",
            password="new_password",
            email="new_email@example.com"
        )
    
    def test_m7_edit_non_existing_user_info(self, user_model):
        """
        Тест M7: Редактирование информации о несуществующем пользователе
        Негативный тест
        """
        # Arrange
        user_info = {
            "username": "non_existing_user",
            "password": "password"
        }
        user_model.db.update_user_info.return_value = False
        
        # Act
        result = user_model.edit_user_info(user_info)
        
        # Assert
        assert result is False
    
    def test_m8_edit_user_info_without_username(self, user_model):
        """
        Тест M8: Редактирование информации без указания username
        Негативный тест
        """
        # Arrange
        user_info = {"password": "new_password"}
        
        # Act
        result = user_model.edit_user_info(user_info)
        
        # Assert
        assert result is False
        user_model.db.update_user_info.assert_not_called()
    
    # ===== метод delete_user =====
    
    def test_m9_delete_existing_user(self, user_model):
        """
        Тест M9: Успешное удаление существующего пользователя
        Позитивный тест
        """
        # Arrange
        username = "existing_user"
        user_model.db.user_exist.return_value = True
        user_model.db.delete_user.return_value = True
        
        # Act
        result = user_model.delete_user(username)
        
        # Assert
        assert result is True
        user_model.db.user_exist.assert_called_once_with(username)
        user_model.db.delete_user.assert_called_once_with(username)
    
    def test_m10_delete_non_existing_user(self, user_model):
        """
        Тест M10: Удаление несуществующего пользователя
        Негативный тест
        """
        # Arrange
        username = "non_existing_user"
        user_model.db.user_exist.return_value = False
        
        # Act
        result = user_model.delete_user(username)
        
        # Assert
        assert result is False
        user_model.db.user_exist.assert_called_once_with(username)
        user_model.db.delete_user.assert_not_called()
