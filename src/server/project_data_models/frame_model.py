from typing import Optional, Dict
import os
from database.repository import DatabaseRepository
from database.base import engine
from database.models import Frame
from sqlalchemy.orm import sessionmaker


class FrameModel:
    def __init__(self):
        self.db = DatabaseRepository()
        self.Session = sessionmaker(bind=engine)
    
    def new_frame(self, username: str, new_frame_data: Dict) -> bool:
        """
        Создание нового кадра проекта
        
        Args:
            username: логин владельца проекта
            new_frame_data: словарь с информацией о новом кадре
        
        Returns:
            success: bool - успешность операции
        """
        project_id = new_frame_data.get('project_id')
        start_time = new_frame_data.get('start_time')
        end_time = new_frame_data.get('end_time')
        pic_path = new_frame_data.get('pic_path')
        description = new_frame_data.get('description')
        number = new_frame_data.get('number')
        
        if not all([project_id, start_time, end_time, pic_path]):
            return False
        
        return self.db.create_frame(
            project_id=project_id,
            start_time=start_time,
            end_time=end_time,
            pic_path=pic_path,
            description=description,
            number=number
        )
    
    def get_frame_info(self, frame_id: int) -> Optional[Dict]:
        """
        Получение подробной информации о кадре
        
        Args:
            frame_id: id кадра
        
        Returns:
            frame_info: словарь с информацией о кадре
        """
        return self.db.read_frame_info(frame_id)
    
    def edit_frame_info(self, frame_id: int, new_frame_data: Dict) -> bool:
        """
        Редактирование информации о кадре
        
        Args:
            frame_id: id редактируемого кадра
            new_frame_data: словарь с информацией о кадре
        
        Returns:
            success: bool - успешность операции
        """
        start_time = new_frame_data.get('start_time')
        end_time = new_frame_data.get('end_time')
        pic_path = new_frame_data.get('pic_path')
        description = new_frame_data.get('description')
        
        return self.db.update_frame_info(
            frame_id=frame_id,
            start_time=start_time,
            end_time=end_time,
            pic_path=pic_path,
            description=description
        )
    
    def delete_frame(self, frame_id: int) -> bool:
        """
        Удаление кадра
        
        Args:
            frame_id: id кадра
        
        Returns:
            success: bool - успешность операции
        """
        # Метод delete_frame уже удаляет изображение кадра
        return self.db.delete_frame(frame_id)
    
    def get_frame_pic(self, frame_id: int) -> Optional[str]:
        """
        Получение пути к изображению кадра
        
        Args:
            frame_id: id кадра
        
        Returns:
            pic_path: путь к изображению кадра
        """
        pic_path = self.db.read_pic_path(frame_id)
        if pic_path and os.path.exists(pic_path):
            return pic_path
        return None
    
    def upload_frame_pic(self, frame_id: int, frame_path: str, frame_pic) -> bool:
        """
        Загрузка/обновление изображения кадра
        
        Args:
            frame_id: id редактируемого кадра
            frame_path: путь к новому файлу
            frame_pic: файл изображения кадра
        
        Returns:
            success: bool - успешность операции
        """
        try:
            # Сохраняем изображение на сервере
            # Предполагаем, что frame_pic - это объект файла или байты
            if hasattr(frame_pic, 'read'):
                # Если это файловый объект
                with open(frame_path, 'wb') as f:
                    f.write(frame_pic.read())
            elif isinstance(frame_pic, bytes):
                # Если это байты
                with open(frame_path, 'wb') as f:
                    f.write(frame_pic)
            else:
                # Если это путь к файлу
                if os.path.exists(frame_pic):
                    import shutil
                    shutil.copy(frame_pic, frame_path)
                else:
                    return False
            
            # Обновляем информацию о кадре в БД
            return self.db.update_frame_info(frame_id, pic_path=frame_path)
        except Exception as e:
            print(f"Error uploading frame picture: {e}")
            return False
    
    def delete_frame_pic(self, frame_id: int) -> bool:
        """
        Удаление изображения кадра (не самого кадра)
        
        Args:
            frame_id: id кадра
        
        Returns:
            success: bool - успешность операции
        """
        frame_info = self.db.read_frame_info(frame_id)
        if not frame_info:
            return False
        
        pic_path = frame_info.get('pic_path')
        if pic_path and os.path.exists(pic_path):
            try:
                # Удаляем файл изображения
                os.remove(pic_path)
                # В БД поле pic_path NOT NULL, поэтому не обновляем его
                # Файл удален, но путь в БД остается (как указатель на несуществующий файл)
                return True
            except Exception as e:
                print(f"Error deleting frame picture: {e}")
                return False
        
        # Если файла нет, считаем операцию успешной
        return True
