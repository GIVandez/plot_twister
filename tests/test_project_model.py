"""
Модульные тесты для ProjectModel
"""
import sys
import os
import pytest
from unittest.mock import Mock, patch, MagicMock

# Добавляем путь к src в PYTHONPATH
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))

from project_data_models.project_model import ProjectModel


class TestProjectModel:
    """Тесты для класса ProjectModel"""
    
    @pytest.fixture
    def project_model(self):
        """Фикстура для создания экземпляра ProjectModel с mock БД"""
        model = ProjectModel()
        model.db = Mock()
        model.Session = Mock()
        return model
    
    # ===== метод new_project =====
    
    def test_new_project_success(self, project_model):
        """Тест: Успешное создание нового проекта"""
        # Arrange
        username = "test_user"
        project_name = "New Project"
        mock_session = Mock()
        
        project_model.db.user_project_exist.return_value = False
        project_model.db.get_user_id_by_login.return_value = 1
        project_model.Session.return_value = mock_session
        
        mock_project = Mock()
        mock_project.id = 42
        mock_session.query.return_value.filter.return_value.first.return_value = Mock()  # owner exists
        mock_session.refresh = Mock()
        mock_session.add = Mock()
        mock_session.commit = Mock()
        
        with patch('database.models.Project', return_value=mock_project):
            # Act
            result = project_model.new_project(username, project_name)
            
            # Assert
            assert result == 42
            project_model.db.user_project_exist.assert_called_once_with(project_name, username)
            project_model.db.get_user_id_by_login.assert_called_once_with(username)
    
    def test_new_project_already_exists(self, project_model):
        """Тест: Создание проекта с уже существующим названием"""
        # Arrange
        username = "test_user"
        project_name = "Existing Project"
        project_model.db.user_project_exist.return_value = True
        
        # Act
        result = project_model.new_project(username, project_name)
        
        # Assert
        assert result is None
        project_model.db.user_project_exist.assert_called_once_with(project_name, username)
    
    def test_new_project_user_not_found(self, project_model):
        """Тест: Создание проекта для несуществующего пользователя"""
        # Arrange
        username = "non_existing_user"
        project_name = "New Project"
        project_model.db.user_project_exist.return_value = False
        project_model.db.get_user_id_by_login.return_value = None
        
        # Act
        result = project_model.new_project(username, project_name)
        
        # Assert
        assert result is None
    
    # ===== метод edit_project_name =====
    
    def test_edit_project_name_success(self, project_model):
        """Тест: Успешное изменение названия проекта"""
        # Arrange
        project_id = 1
        new_name = "Updated Project Name"
        project_model.db.update_project_name.return_value = True
        
        # Act
        result = project_model.edit_project_name(project_id, new_name)
        
        # Assert
        assert result is True
        project_model.db.update_project_name.assert_called_once_with(project_id, new_name)
    
    def test_edit_project_name_failure(self, project_model):
        """Тест: Неудачное изменение названия проекта"""
        # Arrange
        project_id = 999
        new_name = "New Name"
        project_model.db.update_project_name.return_value = False
        
        # Act
        result = project_model.edit_project_name(project_id, new_name)
        
        # Assert
        assert result is False
    
    # ===== метод delete_project =====
    
    def test_delete_project_success(self, project_model):
        """Тест: Успешное удаление проекта"""
        # Arrange
        project_id = 1
        project_model.db.delete_project.return_value = True
        
        # Act
        result = project_model.delete_project(project_id)
        
        # Assert
        assert result is True
        project_model.db.delete_project.assert_called_once_with(project_id)
    
    def test_delete_project_failure(self, project_model):
        """Тест: Неудачное удаление проекта"""
        # Arrange
        project_id = 999
        project_model.db.delete_project.return_value = False
        
        # Act
        result = project_model.delete_project(project_id)
        
        # Assert
        assert result is False
    
    # ===== метод delete_script =====
    
    def test_delete_script_success(self, project_model):
        """Тест: Успешное удаление всех страниц проекта"""
        # Arrange
        project_id = 1
        mock_session = Mock()
        mock_page1 = Mock()
        mock_page1.id = 1
        mock_page2 = Mock()
        mock_page2.id = 2
        
        project_model.Session.return_value = mock_session
        mock_session.query.return_value.filter.return_value.all.return_value = [mock_page1, mock_page2]
        project_model.db.delete_page.return_value = True
        
        # Act
        result = project_model.delete_script(project_id)
        
        # Assert
        assert result is True
        assert project_model.db.delete_page.call_count == 2
    
    def test_delete_script_no_pages(self, project_model):
        """Тест: Удаление скрипта когда нет страниц"""
        # Arrange
        project_id = 1
        mock_session = Mock()
        project_model.Session.return_value = mock_session
        mock_session.query.return_value.filter.return_value.all.return_value = []
        
        # Act
        result = project_model.delete_script(project_id)
        
        # Assert
        assert result is True
        project_model.db.delete_page.assert_not_called()
    
    # ===== метод delete_frames =====
    
    def test_delete_frames_success(self, project_model):
        """Тест: Успешное удаление всех кадров проекта"""
        # Arrange
        project_id = 1
        mock_session = Mock()
        mock_frame1 = Mock()
        mock_frame1.id = 1
        mock_frame2 = Mock()
        mock_frame2.id = 2
        
        project_model.Session.return_value = mock_session
        mock_session.query.return_value.filter.return_value.all.return_value = [mock_frame1, mock_frame2]
        project_model.db.delete_frame.return_value = True
        
        # Act
        result = project_model.delete_frames(project_id)
        
        # Assert
        assert result is True
        assert project_model.db.delete_frame.call_count == 2
    
    # ===== метод connect_fp =====
    
    def test_connect_fp_success(self, project_model):
        """Тест: Успешное связывание кадра со страницей"""
        # Arrange
        frame_id = 1
        page_id = 10
        mock_session = Mock()
        mock_frame = Mock()
        
        project_model.Session.return_value = mock_session
        mock_session.query.return_value.filter.return_value.first.return_value = mock_frame
        
        # Act
        result = project_model.connect_fp(frame_id, page_id)
        
        # Assert
        assert result is True
        assert mock_frame.connected_page == page_id
        mock_session.commit.assert_called_once()
    
    def test_connect_fp_frame_not_found(self, project_model):
        """Тест: Связывание несуществующего кадра со страницей"""
        # Arrange
        frame_id = 999
        page_id = 10
        mock_session = Mock()
        
        project_model.Session.return_value = mock_session
        mock_session.query.return_value.filter.return_value.first.return_value = None
        
        # Act
        result = project_model.connect_fp(frame_id, page_id)
        
        # Assert
        assert result is False
        mock_session.commit.assert_not_called()
    
    # ===== метод disconnect_fp =====
    
    def test_disconnect_fp_success(self, project_model):
        """Тест: Успешный разрыв связи кадра со страницей"""
        # Arrange
        frame_id = 1
        mock_session = Mock()
        mock_frame = Mock()
        mock_frame.connected_page = 10
        
        project_model.Session.return_value = mock_session
        mock_session.query.return_value.filter.return_value.first.return_value = mock_frame
        
        # Act
        result = project_model.disconnect_fp(frame_id)
        
        # Assert
        assert result is True
        assert mock_frame.connected_page is None
        mock_session.commit.assert_called_once()
