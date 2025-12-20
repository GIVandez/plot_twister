from typing import Optional
from database.repository import DatabaseRepository
from database.base import engine
from database.models import Page, Frame
from sqlalchemy.orm import sessionmaker
import os


class ProjectModel:
    def __init__(self):
        self.db = DatabaseRepository()
        self.Session = sessionmaker(bind=engine)
    
    def new_project(self, username: str, project_name: str) -> bool:
        """
        Создание нового проекта пользователя
        
        Args:
            username: логин владельца проекта
            project_name: название проекта
        
        Returns:
            success: bool - успешность операции
        """
        # Проверяем отсутствие проекта с таким же названием у пользователя
        if self.db.user_project_exist(project_name, username):
            return False
        
        # Получаем ID пользователя
        owner_id = self.db.get_user_id_by_login(username)
        if not owner_id:
            return False
        
        # Создаем новый проект
        return self.db.create_project(project_name, owner_id)
    
    def edit_project_name(self, project_id: int, new_project_name: str) -> bool:
        """
        Изменение названия проекта
        
        Args:
            project_id: id проекта
            new_project_name: новое название проекта
        
        Returns:
            success: bool - успешность операции
        """
        return self.db.update_project_name(project_id, new_project_name)
    
    def delete_project(self, project_id: int) -> bool:
        """
        Удаление проекта
        
        Args:
            project_id: id проекта
        
        Returns:
            success: bool - успешность операции
        """
        # Метод delete_project уже удаляет изображения кадров
        return self.db.delete_project(project_id)
    
    def delete_script(self, project_id: int) -> bool:
        """
        Удаление сценария проекта (всех страниц)
        
        Args:
            project_id: id проекта
        
        Returns:
            success: bool - успешность операции
        """
        session = self.Session()
        try:
            # Находим все страницы проекта
            pages = session.query(Page).filter(Page.project_id == project_id).all()
            
            # Удаляем каждую страницу
            for page in pages:
                success = self.db.delete_page(page.id)
                if not success:
                    return False
            
            return True
        except Exception as e:
            print(f"Error deleting script: {e}")
            return False
        finally:
            session.close()
    
    def delete_frames(self, project_id: int) -> bool:
        """
        Удаление раскадровки проекта (всех кадров)
        
        Args:
            project_id: id проекта
        
        Returns:
            success: bool - успешность операции
        """
        session = self.Session()
        try:
            # Находим все кадры проекта
            frames = session.query(Frame).filter(Frame.project_id == project_id).all()
            
            # Удаляем каждый кадр (метод delete_frame уже удаляет изображения)
            for frame in frames:
                success = self.db.delete_frame(frame.id)
                if not success:
                    return False
            
            return True
        except Exception as e:
            print(f"Error deleting frames: {e}")
            return False
        finally:
            session.close()
    
    def connect_fp(self, frame_id: int, page_id: int) -> bool:
        """
        Связывание кадра со страницей сценария
        
        Args:
            frame_id: id кадра
            page_id: id страницы
        
        Returns:
            success: bool - успешность операции
        """
        return self._update_frame_connected_page(frame_id, page_id)
    
    def disconnect_fp(self, frame_id: int) -> bool:
        """
        Разрыв связи кадра со страницей сценария
        
        Args:
            frame_id: id кадра
        
        Returns:
            success: bool - успешность операции
        """
        return self._update_frame_connected_page(frame_id, None)
    
    def _update_frame_connected_page(self, frame_id: int, page_id: Optional[int]) -> bool:
        """Вспомогательный метод для обновления connected_page"""
        session = self.Session()
        try:
            from database.models import Frame
            frame = session.query(Frame).filter(Frame.id == frame_id).first()
            
            if not frame:
                return False
            
            frame.connected_page = page_id
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            print(f"Error updating frame connected_page: {e}")
            return False
        finally:
            session.close()