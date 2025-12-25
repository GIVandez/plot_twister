"""
Модульные тесты для UserModel
"""
import sys
import os
import pytest
from unittest.mock import Mock, MagicMock

# Добавляем путь к src в PYTHONPATH
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

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
        username = "existing_user"
        user_model.db.read_user_info.return_value = {
            'username': 'existing_user',
            'password': 'password123',
            'email': 'user@example.com'
        }
        result = user_model.get_user_info(username)
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
        username = "non_existing_user"
        user_model.db.read_user_info.return_value = None
        result = user_model.get_user_info(username)
        assert result is None
        user_model.db.read_user_info.assert_called_once_with(username)

    # ===== метод edit_user_info =====
    def test_m3_edit_user_info_success(self, user_model):
        """
        Тест M3: Успешное редактирование информации о пользователе
        Позитивный тест
        """
        user_info = {
            "username": "existing_user",
            "password": "new_password",
            "email": "new_email@example.com"
        }
        user_model.db.update_user_info.return_value = True
        result = user_model.edit_user_info(user_info)
        assert result is True
        user_model.db.update_user_info.assert_called_once_with(
            "existing_user",
            password="new_password",
            email="new_email@example.com"
        )

    # ===== метод delete_user =====
    def test_m4_delete_existing_user(self, user_model):
        """
        Тест M4: Успешное удаление существующего пользователя
        Позитивный тест
        """
        username = "existing_user"
        user_model.db.user_exist.return_value = True
        user_model.db.delete_user.return_value = True
        result = user_model.delete_user(username)
        assert result is True
        user_model.db.user_exist.assert_called_once_with(username)
        user_model.db.delete_user.assert_called_once_with(username)
