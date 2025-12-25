"""
Модульные тесты для FrameModel - исправленная версия
"""
import sys
import os
import pytest
from unittest.mock import Mock, patch, MagicMock, mock_open

# Добавляем путь к src в PYTHONPATH
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'src'))

from project_data_models.frame_model import FrameModel


class TestFrameModel:
    """Тесты для класса FrameModel"""
    
    @pytest.fixture
    def frame_model(self):
        """Фикстура для создания экземпляра FrameModel с mock БД"""
        model = FrameModel()
        model.db = Mock()
        model.Session = Mock()
        return model
    
    # ===== метод new_frame =====
    def test_m12_new_frame_with_all_data(self, frame_model):
        """
        Тест M18: Создание нового кадра со всеми данными
        Позитивный тест
        """
        username = "test_user"
        new_frame_data = {
            'project_id': 1,
            'start_time': 0,
            'end_time': 100,
            'pic_path': '/path/to/image.png',
            'description': 'Test frame',
            'number': 5
        }
        mock_session = Mock()
        mock_frame = Mock()
        mock_frame.id = 50
        frame_model.Session.return_value = mock_session
        mock_project = Mock()
        mock_session.query.return_value.filter.return_value.first.return_value = mock_project
        with patch('database.models.Frame', return_value=mock_frame):
            result = frame_model.new_frame(username, new_frame_data)
            assert result == 50
            mock_session.add.assert_called_once_with(mock_frame)
            mock_session.commit.assert_called_once()

    # ===== метод edit_frame_info =====
