"""
Модульные тесты для GraphicEditorModel
"""
import sys
import os
import pytest
from unittest.mock import Mock, patch, mock_open

# Добавляем путь к src в PYTHONPATH
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from project_data_models.graphic_editor_model import GraphicEditorModel


class TestGraphicEditorModel:
    """Тесты для класса GraphicEditorModel"""
    
    @pytest.fixture
    def graphic_editor_model(self):
        """Фикстура для создания экземпляра GraphicEditorModel с mock БД"""
        model = GraphicEditorModel()
        model.db = Mock()
        return model
    
    # ===== метод get_pic =====
    
    def test_get_pic_exists(self, graphic_editor_model):
        """Тест: Получение пути к существующему изображению"""
        # Arrange
        frame_id = 1
        pic_path = '/path/to/image.png'
        graphic_editor_model.db.read_frame_info.return_value = {'pic_path': pic_path}
        
        with patch('os.path.exists', return_value=True):
            # Act
            result = graphic_editor_model.get_pic(frame_id)
            
            # Assert
            assert result == pic_path
            graphic_editor_model.db.read_frame_info.assert_called_once_with(frame_id)
    
    def test_get_pic_file_not_exists(self, graphic_editor_model):
        """Тест: Получение пути к несуществующему файлу изображения"""
        # Arrange
        frame_id = 1
        pic_path = '/path/to/nonexistent.png'
        graphic_editor_model.db.read_frame_info.return_value = {'pic_path': pic_path}
        
        with patch('os.path.exists', return_value=False):
            # Act
            result = graphic_editor_model.get_pic(frame_id)
            
            # Assert
            assert result is None
    
    def test_get_pic_frame_not_found(self, graphic_editor_model):
        """Тест: Получение изображения для несуществующего кадра"""
        # Arrange
        frame_id = 999
        graphic_editor_model.db.read_frame_info.return_value = None
        
        # Act
        result = graphic_editor_model.get_pic(frame_id)
        
        # Assert
        assert result is None
    
    def test_get_pic_no_pic_path(self, graphic_editor_model):
        """Тест: Получение изображения когда pic_path отсутствует"""
        # Arrange
        frame_id = 1
        graphic_editor_model.db.read_frame_info.return_value = {'pic_path': None}
        
        # Act
        result = graphic_editor_model.get_pic(frame_id)
        
        # Assert
        assert result is None
    
    # ===== метод upload_pic =====
    
    def test_upload_pic_from_file_object(self, graphic_editor_model):
        """Тест: Загрузка изображения из файлового объекта"""
        # Arrange
        frame_id = 1
        frame_path = '/uploads/frame1.png'
        mock_file = Mock()
        mock_file.read.return_value = b'image data'
        graphic_editor_model.db.update_frame_info.return_value = True
        
        with patch('builtins.open', mock_open()) as mocked_file:
            # Act
            result = graphic_editor_model.upload_pic(frame_id, frame_path, mock_file)
            
            # Assert
            assert result is True
            mocked_file.assert_called_once_with(frame_path, 'wb')
            graphic_editor_model.db.update_frame_info.assert_called_once_with(frame_id, pic_path=frame_path)
    
    def test_upload_pic_from_bytes(self, graphic_editor_model):
        """Тест: Загрузка изображения из байтов"""
        # Arrange
        frame_id = 1
        frame_path = '/uploads/frame1.png'
        frame_pic = b'image data bytes'
        graphic_editor_model.db.update_frame_info.return_value = True
        
        with patch('builtins.open', mock_open()) as mocked_file:
            # Act
            result = graphic_editor_model.upload_pic(frame_id, frame_path, frame_pic)
            
            # Assert
            assert result is True
            mocked_file.assert_called_once_with(frame_path, 'wb')
    
    def test_upload_pic_from_file_path(self, graphic_editor_model):
        """Тест: Загрузка изображения из файлового пути"""
        # Arrange
        frame_id = 1
        frame_path = '/uploads/frame1.png'
        source_path = '/source/image.png'
        graphic_editor_model.db.update_frame_info.return_value = True
        
        with patch('os.path.exists', return_value=True), \
             patch('os.makedirs'), \
             patch('shutil.copy') as mock_copy:
            # Act
            result = graphic_editor_model.upload_pic(frame_id, frame_path, source_path)
            
            # Assert
            assert result is True
            mock_copy.assert_called_once_with(source_path, frame_path)
    
    def test_upload_pic_source_not_exists(self, graphic_editor_model):
        """Тест: Загрузка изображения из несуществующего источника"""
        # Arrange
        frame_id = 1
        frame_path = '/uploads/frame1.png'
        source_path = '/nonexistent/image.png'
        
        with patch('os.path.exists', return_value=False):
            # Act
            result = graphic_editor_model.upload_pic(frame_id, frame_path, source_path)
            
            # Assert
            assert result is False
            graphic_editor_model.db.update_frame_info.assert_not_called()
    
    def test_upload_pic_db_update_failure(self, graphic_editor_model):
        """Тест: Неудачное обновление БД при загрузке изображения"""
        # Arrange
        frame_id = 1
        frame_path = '/uploads/frame1.png'
        frame_pic = b'image data'
        graphic_editor_model.db.update_frame_info.return_value = False
        
        with patch('builtins.open', mock_open()):
            # Act
            result = graphic_editor_model.upload_pic(frame_id, frame_path, frame_pic)
            
            # Assert
            assert result is False
    
    def test_upload_pic_exception_handling(self, graphic_editor_model):
        """Тест: Обработка исключения при загрузке изображения"""
        # Arrange
        frame_id = 1
        frame_path = '/uploads/frame1.png'
        mock_file = Mock()
        mock_file.read.side_effect = Exception("Read error")
        
        with patch('builtins.open', side_effect=Exception("File error")):
            # Act
            result = graphic_editor_model.upload_pic(frame_id, frame_path, mock_file)
            
            # Assert
            assert result is False
