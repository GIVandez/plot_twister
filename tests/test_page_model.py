"""
Модульные тесты для PageModel
"""
import sys
import os
import pytest
from unittest.mock import Mock, patch

# Добавляем путь к src в PYTHONPATH
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from project_data_models.page_model import PageModel


class TestPageModel:
    """Тесты для класса PageModel"""
    
    @pytest.fixture
    def page_model(self):
        """Фикстура для создания экземпляра PageModel с mock БД"""
        model = PageModel()
        model.db = Mock()
        model.Session = Mock()
        return model
    
    # ===== метод new_page =====
    
    def test_new_page_with_number_and_text(self, page_model):
        """Тест: Создание новой страницы с номером и текстом"""
        # Arrange
        project_id = 1
        number = 5
        text = "Test page content"
        mock_session = Mock()
        mock_page = Mock()
        mock_page.id = 100
        
        page_model.Session.return_value = mock_session
        mock_session.query.return_value.filter.return_value.first.return_value = Mock()  # project exists
        
        with patch('project_data_models.page_model.Page', return_value=mock_page):
            # Act
            result = page_model.new_page(project_id, number, text)
            
            # Assert
            assert result == 100
            mock_session.add.assert_called_once_with(mock_page)
            mock_session.commit.assert_called_once()
    
    def test_new_page_auto_number(self, page_model):
        """Тест: Создание страницы с автоматическим номером"""
        # Arrange
        project_id = 1
        text = "Test content"
        mock_session = Mock()
        mock_page = Mock()
        mock_page.id = 101
        
        page_model.Session.return_value = mock_session
        mock_session.query.return_value.filter.return_value.first.return_value = Mock()  # project exists
        mock_session.query.return_value.filter.return_value.order_by.return_value.first.return_value = (3,)  # max number is 3
        
        with patch('project_data_models.page_model.Page', return_value=mock_page):
            # Act
            result = page_model.new_page(project_id, None, text)
            
            # Assert
            assert result == 101
    
    def test_new_page_project_not_found(self, page_model):
        """Тест: Создание страницы для несуществующего проекта"""
        # Arrange
        project_id = 999
        mock_session = Mock()
        
        page_model.Session.return_value = mock_session
        mock_session.query.return_value.filter.return_value.first.return_value = None  # project not exists
        
        # Act
        result = page_model.new_page(project_id, 1, "Test")
        
        # Assert
        assert result is None
        mock_session.add.assert_not_called()
    
    # ===== метод get_page =====
    
    def test_get_page_success(self, page_model):
        """Тест: Успешное получение информации о странице"""
        # Arrange
        page_id = 1
        expected_data = {
            'page_id': 1,
            'project_id': 10,
            'number': 1,
            'text': 'Page content'
        }
        page_model.db.read_page_info.return_value = expected_data
        
        # Act
        result = page_model.get_page(page_id)
        
        # Assert
        assert result == expected_data
        page_model.db.read_page_info.assert_called_once_with(page_id)
    
    def test_get_page_not_found(self, page_model):
        """Тест: Получение информации о несуществующей странице"""
        # Arrange
        page_id = 999
        page_model.db.read_page_info.return_value = None
        
        # Act
        result = page_model.get_page(page_id)
        
        # Assert
        assert result is None
    
    # ===== метод edit_page =====
    
    def test_edit_page_text_only(self, page_model):
        """Тест: Редактирование только текста страницы"""
        # Arrange
        page_id = 1
        new_data = {'text': 'Updated text'}
        page_model.db.update_page_text.return_value = True
        
        # Act
        result = page_model.edit_page(page_id, new_data)
        
        # Assert
        assert result is True
        page_model.db.update_page_text.assert_called_once_with(page_id, 'Updated text')
        page_model.db.update_page_number.assert_not_called()
    
    def test_edit_page_number_only(self, page_model):
        """Тест: Редактирование только номера страницы"""
        # Arrange
        page_id = 1
        new_data = {'number': 5}
        page_model.db.update_page_number.return_value = True
        
        # Act
        result = page_model.edit_page(page_id, new_data)
        
        # Assert
        assert result is True
        page_model.db.update_page_number.assert_called_once_with(page_id, 5)
        page_model.db.update_page_text.assert_not_called()
    
    def test_edit_page_text_and_number(self, page_model):
        """Тест: Редактирование текста и номера страницы"""
        # Arrange
        page_id = 1
        new_data = {'text': 'New text', 'number': 3}
        page_model.db.update_page_text.return_value = True
        page_model.db.update_page_number.return_value = True
        
        # Act
        result = page_model.edit_page(page_id, new_data)
        
        # Assert
        assert result is True
        page_model.db.update_page_text.assert_called_once_with(page_id, 'New text')
        page_model.db.update_page_number.assert_called_once_with(page_id, 3)
    
    def test_edit_page_failure(self, page_model):
        """Тест: Неудачное редактирование страницы"""
        # Arrange
        page_id = 999
        new_data = {'text': 'New text'}
        page_model.db.update_page_text.return_value = False
        
        # Act
        result = page_model.edit_page(page_id, new_data)
        
        # Assert
        assert result is False
    
    # ===== метод delete_page =====
    
    def test_delete_page_success(self, page_model):
        """Тест: Успешное удаление страницы"""
        # Arrange
        page_id = 1
        page_model.db.delete_page.return_value = True
        
        # Act
        result = page_model.delete_page(page_id)
        
        # Assert
        assert result is True
        page_model.db.delete_page.assert_called_once_with(page_id)
    
    def test_delete_page_not_found(self, page_model):
        """Тест: Удаление несуществующей страницы"""
        # Arrange
        page_id = 999
        page_model.db.delete_page.return_value = False
        
        # Act
        result = page_model.delete_page(page_id)
        
        # Assert
        assert result is False
