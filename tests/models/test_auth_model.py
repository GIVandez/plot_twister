"""
Модульные тесты для AuthModel
"""
import sys
import os
import pytest
from unittest.mock import Mock, patch

# Добавляем путь к src в PYTHONPATH
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from user_models.auth_model import AuthModel


class TestAuthModel:
    """Тесты для класса AuthModel"""
    
    @pytest.fixture
    def auth_model(self):
        """Фикстура для создания экземпляра AuthModel с mock БД"""
        model = AuthModel()
        model.db = Mock()
        return model
    
    # ===== метод login =====
    
    def test_m23_successful_login(self, auth_model):
        """
        Тест M23: Проверка успешной авторизации пользователя
        Позитивный тест
        """
        # Arrange
        username = "testuser"
        password = "correct_password"
        auth_model.db.user_exist.return_value = True
        auth_model.db.read_user_info.return_value = {
            'username': username,
            'password': password,
            'role': 'user'
        }
        
        # Act
        result = auth_model.login(username, password)
        
        # Assert
        assert isinstance(result, int)
        assert result >= 1000  # Токен авторизации должен быть >= 1000
        auth_model.db.user_exist.assert_called_once_with(username)
        auth_model.db.read_user_info.assert_called_once_with(username)
    
    def test_m24_login_with_wrong_password(self, auth_model):
        """
        Тест M24: Проверка авторизации с неверным паролем
        Негативный тест
        """
        # Arrange
        username = "testuser"
        password = "wrong_password"
        auth_model.db.user_exist.return_value = True
        auth_model.db.read_user_info.return_value = {
            'username': username,
            'password': 'correct_password',
            'role': 'user'
        }
        
        # Act
        result = auth_model.login(username, password)
        
        # Assert
        assert result == 2  # Код ошибки неверного пароля
        auth_model.db.user_exist.assert_called_once_with(username)
        auth_model.db.read_user_info.assert_called_once_with(username)
    
    def test_m25_login_with_non_existing_user(self, auth_model):
        """
        Тест M25: Проверка авторизации с несуществующим логином
        Негативный тест
        """
        # Arrange
        username = "non_existing_user"
        password = "any_password"
        auth_model.db.user_exist.return_value = False
        
        # Act
        result = auth_model.login(username, password)
        
        # Assert
        assert result == 1  # Код ошибки пользователь не найден
        auth_model.db.user_exist.assert_called_once_with(username)
        auth_model.db.read_user_info.assert_not_called()
    
    # ===== метод register =====
    
    def test_m26_successful_registration(self, auth_model):
        """
        Тест M26: Проверка успешной регистрации нового пользователя
        Позитивный тест
        """
        # Arrange
        username = "new_user"
        password = "password123"
        email = "email@example.com"
        auth_model.db.user_exist.return_value = False
        auth_model.db.create_user.return_value = True
        
        # Act
        result = auth_model.register(username, password, email)
        
        # Assert
        assert result is not None
        assert isinstance(result, int)
        assert result >= 0  # Токен авторизации
        auth_model.db.user_exist.assert_called_once_with(username)
        auth_model.db.create_user.assert_called_once_with(username, password, email)
    
    def test_m27_registration_with_existing_user(self, auth_model):
        """
        Тест M27: Проверка регистрации, если пользователь уже существует
        Негативный тест
        """
        # Arrange
        username = "existing_user"
        password = "password123"
        email = "email@example.com"
        auth_model.db.user_exist.return_value = True
        
        # Act
        result = auth_model.register(username, password, email)
        
        # Assert
        assert result is None
        auth_model.db.user_exist.assert_called_once_with(username)
        auth_model.db.create_user.assert_not_called()
