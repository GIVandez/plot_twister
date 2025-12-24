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
    
    def test_new_frame_with_all_data(self, frame_model):
        """Тест: Создание нового кадра со всеми данными"""
        # Arrange
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
        
        # Настраиваем mock для проверки существования проекта
        mock_project = Mock()
        mock_session.query.return_value.filter.return_value.first.return_value = mock_project
        
        with patch('database.models.Frame', return_value=mock_frame):
            # Act
            result = frame_model.new_frame(username, new_frame_data)
            
            # Assert
            assert result == 50
            mock_session.add.assert_called_once_with(mock_frame)
            mock_session.commit.assert_called_once()
    
    def test_new_frame_project_not_found(self, frame_model):
        """Тест: Создание кадра для несуществующего проекта"""
        # Arrange
        username = "test_user"
        new_frame_data = {
            'project_id': 999,
            'start_time': 0,
            'end_time': 100
        }
        mock_session = Mock()
        
        frame_model.Session.return_value = mock_session
        mock_session.query.return_value.filter.return_value.first.return_value = None  # project not exists
        
        # Act
        result = frame_model.new_frame(username, new_frame_data)
        
        # Assert
    
    # ===== метод get_frame_info =====
    
    def test_get_frame_info_success(self, frame_model):
        """Тест: Успешное получение информации о кадре"""
        # Arrange
        frame_id = 1
        expected_data = {
            'frame_id': 1,
            'project_id': 10,
            'start_time': 0,
            'end_time': 100,
            'pic_path': '/path/to/image.png',
            'description': 'Test frame'
        }
        frame_model.db.read_frame_info.return_value = expected_data
        
        # Act
        result = frame_model.get_frame_info(frame_id)
        
        # Assert
        assert result == expected_data
        frame_model.db.read_frame_info.assert_called_once_with(frame_id)
    
    # ===== метод edit_frame_info =====
    
    def test_edit_frame_info_success(self, frame_model):
        """Тест: Успешное редактирование информации о кадре"""
        # Arrange
        frame_id = 1
        new_frame_data = {
            'start_time': 10,
            'end_time': 110,
            'pic_path': '/new/path.png',
            'description': 'Updated description'
        }
        frame_model.db.update_frame_info.return_value = True
        
        # Act
        result = frame_model.edit_frame_info(frame_id, new_frame_data)
        
        # Assert
        assert result is True
        frame_model.db.update_frame_info.assert_called_once_with(
            frame_id=frame_id,
            start_time=10,
            end_time=110,
            pic_path='/new/path.png',
            description='Updated description'
        )
    
    # ===== метод update_frame_number =====
    
    def test_update_frame_number_success(self, frame_model):
        """Тест: Успешное обновление номера кадра"""
        # Arrange
        frame_id = 1
        number = 5
        frame_model.db.update_frame_info.return_value = True
        
        # Act
        result = frame_model.update_frame_number(frame_id, number)
        
        # Assert
        assert result is True
        frame_model.db.update_frame_info.assert_called_once_with(frame_id=frame_id, number=number)
    
    # ===== метод delete_frame =====
    
    def test_delete_frame_success(self, frame_model):
        """Тест: Успешное удаление кадра"""
        # Arrange
        frame_id = 1
        mock_session = Mock()
        mock_frame = Mock()
        mock_frame.id = frame_id
        mock_frame.project_id = 10
        mock_frame.number = 2
        
        frame_model.Session.return_value = mock_session
        mock_session.query.return_value.filter.return_value.first.return_value = mock_frame
        mock_session.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        
        # Act
        result = frame_model.delete_frame(frame_id)
        
        # Assert
        assert result is True
        mock_session.delete.assert_called_once_with(mock_frame)
    
    # ===== метод get_project_frames =====
    
    def test_get_project_frames_success(self, frame_model):
        """Тест: Получение всех кадров проекта"""
        # Arrange
        project_id = 1
        mock_session = Mock()
        mock_frame1 = Mock()
        mock_frame1.id = 1
        mock_frame1.description = 'Frame 1'
        mock_frame1.start_time = 0
        mock_frame1.end_time = 50
        mock_frame1.pic_path = '/path1.png'
        mock_frame1.connected_page = None
        mock_frame1.number = 1
        
        mock_frame2 = Mock()
        mock_frame2.id = 2
        mock_frame2.description = 'Frame 2'
        mock_frame2.start_time = 50
        mock_frame2.end_time = 100
        mock_frame2.pic_path = '/path2.png'
        mock_frame2.connected_page = 5
        mock_frame2.number = 2
        
        frame_model.Session.return_value = mock_session
        mock_session.query.return_value.filter.return_value.first.return_value = Mock()  # project exists
        mock_session.query.return_value.filter.return_value.order_by.return_value.all.return_value = [mock_frame1, mock_frame2]
        
        # Act
        result = frame_model.get_project_frames(project_id)
        
        # Assert
        assert len(result) == 2
        assert result[0]['frame_id'] == 1
        assert result[1]['frame_id'] == 2
        assert result[1]['connected'] == '5'
    
    # ===== метод upload_frame_pic =====
    
    def test_upload_frame_pic_from_file_object(self, frame_model):
        """Тест: Загрузка изображения из файлового объекта"""
        # Arrange
        frame_id = 1
        frame_path = '/uploads/frame1.png'
        mock_file = Mock()
        mock_file.read.return_value = b'image data'
        frame_model.db.update_frame_info.return_value = True
        
        with patch('builtins.open', mock_open()):
            # Act
            result = frame_model.upload_frame_pic(frame_id, frame_path, mock_file)
            
            # Assert
            assert result is True
            frame_model.db.update_frame_info.assert_called_once_with(frame_id, pic_path=frame_path)
