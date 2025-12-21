from typing import Optional, Dict
import os
from database.repository import DatabaseRepository


class GraphicEditorModel:
    def __init__(self):
        self.db = DatabaseRepository()
    
    def get_pic(self, frame_id: int) -> Optional[str]:
        """
        Получение пути к изображению кадра
        
        Args:
            frame_id: id кадра
        
        Returns:
            frame_info: путь к файлу изображения кадра (если существует)
        """
        frame_info = self.db.read_frame_info(frame_id)
        if not frame_info:
            return None
        
        pic_path = frame_info.get('pic_path')
        if pic_path and os.path.exists(pic_path):
            return pic_path
        return None
    
    def upload_pic(self, frame_id: int, frame_path: str, frame_pic) -> bool:
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
                    # Создаем директорию, если её нет
                    os.makedirs(os.path.dirname(frame_path), exist_ok=True)
                    shutil.copy(frame_pic, frame_path)
                else:
                    return False
            
            # Обновляем информацию о кадре в БД
            return self.db.update_frame_info(frame_id, pic_path=frame_path)
        except Exception as e:
            print(f"Error uploading picture: {e}")
            return False