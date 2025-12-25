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
    def test_m7_successful_login(self, auth_model):
        """
        Тест M10: Проверка успешной авторизации пользователя
        Позитивный тест
        """
        username = "testuser"
        password = "correct_password"
        auth_model.db.user_exist.return_value = True
        auth_model.db.read_user_info.return_value = {
            'username': username,
            'password': password,
            'role': 'user'
        }
        result = auth_model.login(username, password)
        assert isinstance(result, int)
        assert result >= 1000
        auth_model.db.user_exist.assert_called_once_with(username)
        auth_model.db.read_user_info.assert_called_once_with(username)

    def test_m8_login_with_wrong_password(self, auth_model):
        """
        Тест M11: Проверка авторизации с неверным паролем
        Негативный тест
        """
        username = "testuser"
        password = "wrong_password"
        auth_model.db.user_exist.return_value = True
        auth_model.db.read_user_info.return_value = {
            'username': username,
            'password': 'correct_password',
            'role': 'user'
        }
        result = auth_model.login(username, password)
        assert result == 2
        auth_model.db.user_exist.assert_called_once_with(username)
        auth_model.db.read_user_info.assert_called_once_with(username)

    # ===== метод register =====
    def test_m53_successful_registration(self, auth_model):
        """
        Тест M53: Проверка успешной регистрации нового пользователя
        Позитивный тест
        """
        username = "new_user"
        password = "password123"
        email = "email@example.com"
        auth_model.db.user_exist.return_value = False
        auth_model.db.create_user.return_value = True
        result = auth_model.register(username, password, email)
        assert result is not None
        assert isinstance(result, int)
        assert result >= 0
        auth_model.db.user_exist.assert_called_once_with(username)
        auth_model.db.create_user.assert_called_once_with(username, password, email)
