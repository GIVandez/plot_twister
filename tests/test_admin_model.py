"""
Модульные тесты для AdminModel
"""
import sys
import os
import pytest
from unittest.mock import Mock, patch

# Добавляем путь к src в PYTHONPATH
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from user_models.admin_model import AdminModel


class TestAdminModel:
    """Тесты для класса AdminModel"""
    
    @pytest.fixture
    def admin_model(self):
        """Фикстура для создания экземпляра AdminModel с mock БД"""
        model = AdminModel()
        model.db = Mock()
        return model
    
    # ===== метод new_user =====
    
    def test_m11_new_user_with_valid_data(self, admin_model):
        """
        Тест M11: Создание нового пользователя с корректными данными
        Позитивный тест
        """
        # Arrange
        user_info = {
            "username": "new_user",
            "password": "password123",
            "email": "email@example.com"
        }
        admin_model.db.user_exist.return_value = False
        admin_model.db.create_user.return_value = True
        
        # Act
        result = admin_model.new_user(user_info)
        
        # Assert
        assert result is True
        admin_model.db.user_exist.assert_called_once_with("new_user")
        admin_model.db.create_user.assert_called_once_with(
            "new_user", "password123", "email@example.com"
        )
    
    def test_m12_new_user_with_existing_login(self, admin_model):
        """
        Тест M12: Создание пользователя с уже существующим логином
        Негативный тест
        """
        # Arrange
        user_info = {
            "username": "existing_user",
            "password": "password"
        }
        admin_model.db.user_exist.return_value = True
        
        # Act
        result = admin_model.new_user(user_info)
        
        # Assert
        assert result is False
        admin_model.db.user_exist.assert_called_once_with("existing_user")
        admin_model.db.create_user.assert_not_called()
    
    def test_m13_new_user_without_password(self, admin_model):
        """
        Тест M13: Создание пользователя без пароля
        Негативный тест
        """
        # Arrange
        user_info = {
            "username": "new_user",
            "email": "email@example.com"
        }
        
        # Act
        result = admin_model.new_user(user_info)
        
        # Assert
        assert result is False
        admin_model.db.user_exist.assert_not_called()
        admin_model.db.create_user.assert_not_called()
    
    def test_m14_new_user_without_username(self, admin_model):
        """
        Тест M14: Создание пользователя без логина
        Негативный тест
        """
        # Arrange
        user_info = {"password": "password123"}
        
        # Act
        result = admin_model.new_user(user_info)
        
        # Assert
        assert result is False
        admin_model.db.user_exist.assert_not_called()
        admin_model.db.create_user.assert_not_called()
    
    # ===== метод give_admin_role =====
    
    def test_m15_give_admin_role_to_existing_user(self, admin_model):
        """
        Тест M15: Назначение роли администратора существующему пользователю
        Позитивный тест
        """
        # Arrange
        user_id = 123
        with patch.object(admin_model, '_get_username_by_id', return_value='test_user'):
            admin_model.db.update_user_info.return_value = True
            
            # Act
            result = admin_model.give_admin_role(user_id)
            
            # Assert
            assert result is True
            admin_model.db.update_user_info.assert_called_once_with('test_user', role='admin')
    
    def test_m16_give_admin_role_to_non_existing_user(self, admin_model):
        """
        Тест M16: Назначение роли администратора несуществующему пользователю
        Негативный тест
        """
        # Arrange
        user_id = 999999
        with patch.object(admin_model, '_get_username_by_id', return_value=None):
            
            # Act
            result = admin_model.give_admin_role(user_id)
            
            # Assert
            assert result is False
            admin_model.db.update_user_info.assert_not_called()
    
    # ===== метод remove_admin_role =====
    
    def test_m17_remove_admin_role_from_user(self, admin_model):
        """
        Тест M17: Удаление роли администратора у пользователя
        Позитивный тест
        """
        # Arrange
        user_id = 123
        with patch.object(admin_model, '_get_username_by_id', return_value='test_user'):
            admin_model.db.update_user_info.return_value = True
            
            # Act
            result = admin_model.remove_admin_role(user_id)
            
            # Assert
            assert result is True
            admin_model.db.update_user_info.assert_called_once_with('test_user', role='user')
    
    def test_m18_remove_admin_role_from_non_existing_user(self, admin_model):
        """
        Тест M18: Удаление роли администратора у несуществующего пользователя
        Негативный тест
        """
        # Arrange
        user_id = 999999
        with patch.object(admin_model, '_get_username_by_id', return_value=None):
            
            # Act
            result = admin_model.remove_admin_role(user_id)
            
            # Assert
            assert result is False
            admin_model.db.update_user_info.assert_not_called()
    
    # ===== метод edit_user_info =====
    
    def test_m19_edit_existing_user_info_by_admin(self, admin_model):
        """
        Тест M19: Редактирование информации о существующем пользователе администратором
        Позитивный тест
        """
        # Arrange
        user_info = {
            "username": "existing_user",
            "password": "new_password"
        }
        admin_model.db.user_exist.return_value = True
        admin_model.db.update_user_info.return_value = True
        
        # Act
        result = admin_model.edit_user_info(user_info)
        
        # Assert
        assert result is True
        admin_model.db.user_exist.assert_called_once_with("existing_user")
        admin_model.db.update_user_info.assert_called_once_with(
            "existing_user",
            password="new_password",
            email=None
        )
    
    def test_m20_edit_non_existing_user_info_by_admin(self, admin_model):
        """
        Тест M20: Редактирование информации о несуществующем пользователе
        Негативный тест
        """
        # Arrange
        user_info = {
            "username": "non_existing_user",
            "password": "password"
        }
        admin_model.db.user_exist.return_value = False
        
        # Act
        result = admin_model.edit_user_info(user_info)
        
        # Assert
        assert result is False
        admin_model.db.user_exist.assert_called_once_with("non_existing_user")
        admin_model.db.update_user_info.assert_not_called()
    
    # ===== метод delete_user =====
    
    def test_m21_delete_existing_user_by_admin(self, admin_model):
        """
        Тест M21: Удаление существующего пользователя администратором
        Позитивный тест
        """
        # Arrange
        username = "existing_user"
        admin_model.db.user_exist.return_value = True
        admin_model.db.delete_user.return_value = True
        
        # Act
        result = admin_model.delete_user(username)
        
        # Assert
        assert result is True
        admin_model.db.user_exist.assert_called_once_with(username)
        admin_model.db.delete_user.assert_called_once_with(username)
    
    def test_m22_delete_non_existing_user_by_admin(self, admin_model):
        """
        Тест M22: Удаление несуществующего пользователя
        Негативный тест
        """
        # Arrange
        username = "non_existing_user"
        admin_model.db.user_exist.return_value = False
        
        # Act
        result = admin_model.delete_user(username)
        
        # Assert
        assert result is False
        admin_model.db.user_exist.assert_called_once_with(username)
        admin_model.db.delete_user.assert_not_called()
