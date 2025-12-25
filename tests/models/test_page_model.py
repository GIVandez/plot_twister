"""
Модульные тесты для PageModel
"""
import sys
import os
import pytest
from unittest.mock import Mock, patch

# Добавляем путь к src в PYTHONPATH
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

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
    
    # ===== метод get_page =====
    def test_m11_get_page_success(self, page_model):
        """
        Тест M16: Успешное получение информации о странице
        Позитивный тест
        """
        page_id = 1
        expected_data = {
            'page_id': 1,
            'project_id': 10,
            'number': 1,
            'text': 'Page content'
        }
        page_model.db.read_page_info.return_value = expected_data
        result = page_model.get_page(page_id)
        assert result == expected_data
        page_model.db.read_page_info.assert_called_once_with(page_id)

    # ===== метод edit_page =====
