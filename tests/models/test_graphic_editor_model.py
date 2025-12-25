"""
Модульные тесты для GraphicEditorModel
"""
import sys
import os
import pytest
from unittest.mock import Mock, patch, mock_open

# Добавляем путь к src в PYTHONPATH
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from project_data_models.graphic_editor_model import GraphicEditorModel


class TestGraphicEditorModel:
    """Тесты для класса GraphicEditorModel"""
    
    @pytest.fixture
    def graphic_editor_model(self):
        """Фикстура для создания экземпляра GraphicEditorModel с mock БД"""
        model = GraphicEditorModel()
        model.db = Mock()
        return model
    
    

