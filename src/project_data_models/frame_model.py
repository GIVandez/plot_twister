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
    
    def new_frame(self, username: str, new_frame_data: Dict) -> Optional[int]:
        """
        Создание нового кадра проекта
        
        Args:
            username: логин владельца проекта
            new_frame_data: словарь с информацией о новом кадре
        
        Returns:
            frame_id: int - ID созданного кадра или None в случае ошибки
        """
        project_id = new_frame_data.get('project_id')
        start_time = new_frame_data.get('start_time')
        end_time = new_frame_data.get('end_time')
        pic_path = new_frame_data.get('pic_path', '')
        description = new_frame_data.get('description')
        number = new_frame_data.get('number')
        
        if not all([project_id, start_time is not None, end_time is not None]):
            return None
        
        # Используем сессию для создания и получения ID
        session = self.Session()
        try:
            from database.models import Frame, Project
            # Проверяем существование проекта
            project = session.query(Project).filter(Project.id == project_id).first()
            if not project:
                return None
            
            # Если номер не указан, определяем автоматически
            if number is None:
                max_number = session.query(Frame.number).filter(
                    Frame.project_id == project_id
                ).order_by(Frame.number.desc()).first()
                new_number = 1 if not max_number else max_number[0] + 1
            else:
                new_number = number
            
            new_frame = Frame(
                project_id=project_id,
                description=description,
                start_time=start_time,
                end_time=end_time,
                pic_path=pic_path,
                number=new_number
            )
            
            session.add(new_frame)
            session.commit()
            session.refresh(new_frame)
            return new_frame.id
            
        except Exception as e:
            session.rollback()
            print(f"Error creating frame: {e}")
            return None
        finally:
            session.close()
    
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
    
    def update_frame_number(self, frame_id: int, number: int) -> bool:
        """
        Обновление порядкового номера кадра
        
        Args:
            frame_id: id кадра
            number: новый порядковый номер
        
        Returns:
            success: bool - успешность операции
        """
        print(f"FrameModel.update_frame_number called: {frame_id} -> {number}")
        success = self.db.update_frame_info(frame_id=frame_id, number=number)
        print(f"FrameModel.update_frame_number result: {success}")
        return success
    
    def reorder_frames(self, project_id: int, frame_id: int, new_number: int) -> bool:
        """
        Переупорядочивание кадров при перетаскивании
        
        Args:
            project_id: id проекта
            frame_id: id перемещаемого кадра
            new_number: новая позиция кадра
        
        Returns:
            success: bool - успешность операции
        """
        session = self.Session()
        try:
            print(f"reorder_frames called: project_id={project_id}, frame_id={frame_id}, new_number={new_number}")
            
            # Получаем все кадры проекта, отсортированные по number
            frames = session.query(Frame).filter(Frame.project_id == project_id).order_by(Frame.number).all()
            print(f"Found {len(frames)} frames in project {project_id}")
            
            # Находим индекс перемещаемого кадра
            frame_index = None
            for i, frame in enumerate(frames):
                if frame.id == frame_id:
                    frame_index = i
                    break
            
            if frame_index is None:
                print(f"Frame {frame_id} not found in project {project_id}")
                return False
            
            # Сохраняем длительности слотов (позиции) в текущем порядке — они привязаны к таймлайну,
            # а не к самим кадрам. При перестановке слоты остаются прежними, кадры займут их.
            slot_durations = []
            for fr in frames:
                try:
                    dur = max(0, (fr.end_time or 0) - (fr.start_time or 0))
                except Exception:
                    dur = 0
                slot_durations.append(int(dur))

            # Удаляем кадр из списка
            moved_frame = frames.pop(frame_index)
            
            # Вставляем на новую позицию (new_number - 1, поскольку number начинается с 1)
            new_index = new_number - 1
            if new_index < 0:
                new_index = 0
            elif new_index > len(frames):
                new_index = len(frames)
            
            frames.insert(new_index, moved_frame)
            
            # Сначала устанавливаем временные отрицательные номера, чтобы избежать UNIQUE constraint
            for i, frame in enumerate(frames):
                frame.number = -(i + 1)
            session.flush()  # Применяем изменения в транзакции
            
            # Теперь устанавливаем финальные положительные номера
            for i, frame in enumerate(frames):
                frame.number = i + 1

            # Пересчитываем start_time/end_time для всех кадров, используя сохранённые длительности слотов.
            # Длительности позиций (slot_durations) применяются к новым кадрам в порядке их появления.
            current_start = 0
            for i, frame in enumerate(frames):
                dur = 0
                if i < len(slot_durations):
                    dur = int(slot_durations[i])
                frame.start_time = int(current_start)
                frame.end_time = int(current_start + dur)
                current_start = frame.end_time

            # Устанавливаем start_time первого кадра на 00:00
            if frames:
                frames[0].start_time = 0

            session.commit()
            print(f"reorder_frames: successfully reordered frames and updated times")
            return True
            
        except Exception as e:
            session.rollback()
            import traceback
            print(f"Error reordering frames: {e}")
            traceback.print_exc()
            return False
        finally:
            session.close()
    
    def reorder_frames_by_frame_id(self, frame_id: int, new_number: int) -> bool:
        """
        Переупорядочивание кадров по frame_id и новой позиции
        
        Args:
            frame_id: id перемещаемого кадра
            new_number: новая позиция кадра
        
        Returns:
            success: bool - успешность операции
        """
        session = self.Session()
        try:
            # Получаем project_id из кадра
            frame = session.query(Frame).filter(Frame.id == frame_id).first()
            if not frame:
                return False
            project_id = frame.project_id
            session.close()
            
            return self.reorder_frames(project_id, frame_id, new_number)
        except Exception as e:
            session.close()
            print(f"Error reordering frames by frame_id: {e}")
            return False
    
    def delete_frame(self, frame_id: int) -> bool:
        """
        Удаление кадра
        
        Args:
            frame_id: id кадра
        
        Returns:
            success: bool - успешность операции
        """
        session = self.Session()
        try:
            # Получаем project_id и номер кадра
            frame = session.query(Frame).filter(Frame.id == frame_id).first()
            if not frame:
                return False
            project_id = frame.project_id
            deleted_number = frame.number
            
            # Удаляем кадр
            session.delete(frame)
            session.commit()
            
            # Пересчитываем номера и времена для оставшихся кадров
            frames = session.query(Frame).filter(Frame.project_id == project_id).order_by(Frame.number).all()
            
            # Обновляем номера
            for i, f in enumerate(frames):
                f.number = i + 1
            
            # Пересчитываем времена, сохраняя длительности
            current_start = 0
            for f in frames:
                dur = max(0, (f.end_time or 0) - (f.start_time or 0))
                f.start_time = current_start
                f.end_time = current_start + dur
                current_start = f.end_time
            
            # Устанавливаем start_time первого кадра на 00:00
            if frames:
                frames[0].start_time = 0
            
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            print(f"Error deleting frame: {e}")
            return False
        finally:
            session.close()
    
    def get_project_frames(self, project_id: int) -> list:
        """
        Получение всех кадров проекта
        
        Args:
            project_id: id проекта
        
        Returns:
            frames: список словарей с информацией о кадрах
        """
        session = self.Session()
        try:
            from database.models import Project
            # Проверяем существование проекта
            project = session.query(Project).filter(Project.id == project_id).first()
            if not project:
                return []
            
            frames = session.query(Frame).filter(Frame.project_id == project_id).order_by(Frame.number).all()
            
            result = []
            for frame in frames:
                result.append({
                    'frame_id': frame.id,
                    'description': frame.description or '',
                    'start_time': frame.start_time,
                    'end_time': frame.end_time,
                    'pic_path': frame.pic_path,
                    'connected': str(frame.connected_page) if frame.connected_page else '',
                    'number': frame.number
                })
            
            return result
        except Exception as e:
            print(f"Error getting project frames: {e}")
            return []
        finally:
            session.close()
    
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
    
    def update_frame_image_path(self, frame_id: int, pic_path: str) -> bool:
        """
        Обновление пути к изображению кадра
        
        Args:
            frame_id: ID кадра
            pic_path: новый путь к изображению
        
        Returns:
            bool: True если обновлено успешно
        """
        session = self.Session()
        try:
            frame = session.query(Frame).filter(Frame.id == frame_id).first()
            if not frame:
                return False
            frame.pic_path = pic_path
            session.commit()
            return True
        except Exception as e:
            session.rollback()
            print(f"Error updating frame image path: {e}")
            return False
        finally:
            session.close()
