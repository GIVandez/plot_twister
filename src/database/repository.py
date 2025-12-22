from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

from database.base import engine
from database.models import User, Project, Page, Frame

import os
from typing import Optional, Dict, List



class DatabaseRepository:
    def __init__(self):
        self.Session = sessionmaker(bind=engine)

    # ==================== User Methods ====================

    def create_user(self, username: str, password: str, email: str) -> bool:
        """Создание записи для нового пользователя"""
        session = self.Session()
        try:
            # Проверяем существует ли пользователь
            if self.user_exist(username):
                return False
            
            # Создаем нового пользователя
            new_user = User(
                login=username,
                password=password,
                role='user'  # По умолчанию обычный пользователь
            )
            
            session.add(new_user)
            session.commit()
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error creating user: {e}")
            return False
        finally:
            session.close()

    def read_user_info(self, username: str) -> Optional[Dict]:
        """Получение информации о пользователе"""
        session = self.Session()
        try:
            user = session.query(User).filter(User.login == username).first()
            
            if user:
                return {
                    'username': user.login,
                    'password': user.password,
                    'role': user.role
                }
            return None
            
        except Exception as e:
            print(f"Error reading user info: {e}")
            return None
        finally:
            session.close()

    def update_user_info(self, username: str, password: Optional[str] = None, 
                         email: Optional[str] = None, role: Optional[str] = None) -> bool:
        """Изменение информации о пользователе"""
        session = self.Session()
        try:
            user = session.query(User).filter(User.login == username).first()
            
            if not user:
                return False
            
            if password:
                user.password = password
            if role:
                user.role = role
            
            session.commit()
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error updating user info: {e}")
            return False
        finally:
            session.close()

    def delete_user(self, username: str) -> bool:
        """Удаление пользователя и его проектов"""
        session = self.Session()
        try:
            user = session.query(User).filter(User.login == username).first()
            
            if not user:
                return False
            
            # Каскадное удаление через SQLAlchemy
            session.delete(user)
            session.commit()
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error deleting user: {e}")
            return False
        finally:
            session.close()

    def user_exist(self, username: str) -> bool:
        """Проверка наличия пользователя с переданным логином"""
        session = self.Session()
        try:
            user = session.query(User).filter(User.login == username).first()
            return user is not None
        finally:
            session.close()

    # ==================== Project Methods ====================

    def user_project_exist(self, project_name: str, username: str) -> bool:
        """Проверка наличия проекта с переданным названием у пользователя"""
        session = self.Session()
        try:
            project = session.query(Project).join(User).filter(
                Project.name == project_name,
                User.login == username
            ).first()
            return project is not None
        finally:
            session.close()

    def read_user_projects(self, username: str) -> List[Dict]:
        """Получение списка проектов пользователя"""
        session = self.Session()
        try:
            projects = session.query(Project).join(User).filter(
                User.login == username
            ).all()
            
            return [
                {
                    'project_id': p.id,
                    'project_name': p.name,
                    'owner_username': username
                }
                for p in projects
            ]
        finally:
            session.close()

    def create_project(self, name: str, owner_id: int) -> bool:
        """Создание нового проекта пользователя"""
        session = self.Session()
        try:
            # Проверяем существование пользователя
            owner = session.query(User).filter(User.id == owner_id).first()
            if not owner:
                return False
            
            new_project = Project(name=name, owner=owner_id)
            session.add(new_project)
            session.commit()
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error creating project: {e}")
            return False
        finally:
            session.close()

    def read_project_info(self, project_id: int) -> Optional[Dict]:
        """Получение информации о проекте пользователя"""
        session = self.Session()
        try:
            project = session.query(Project).filter(Project.id == project_id).first()
            
            if project:
                owner = session.query(User).filter(User.id == project.owner).first()
                return {
                    'project_id': project.id,
                    'project_name': project.name,
                    'owner_username': owner.login if owner else None
                }
            return None
            
        except Exception as e:
            print(f"Error reading project info: {e}")
            return None
        finally:
            session.close()

    def update_project_name(self, project_id: int, new_name: str) -> bool:
        """Изменение названия проекта"""
        session = self.Session()
        try:
            project = session.query(Project).filter(Project.id == project_id).first()
            
            if not project:
                return False
            
            project.name = new_name
            session.commit()
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error updating project name: {e}")
            return False
        finally:
            session.close()

    def delete_project(self, project_id: int) -> bool:
        """Удаление проекта пользователя"""
        session = self.Session()
        try:
            project = session.query(Project).filter(Project.id == project_id).first()
            
            if not project:
                return False
            
            # Удаляем изображения кадров проекта
            frames = session.query(Frame).filter(Frame.project_id == project_id).all()
            for frame in frames:
                if os.path.exists(frame.pic_path):
                    os.remove(frame.pic_path)
            
            # Удаляем проект (каскадное удаление через SQLAlchemy)
            session.delete(project)
            session.commit()
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error deleting project: {e}")
            return False
        finally:
            session.close()

    # ==================== Frame Methods ====================

    def create_frame(self, project_id: int, start_time: int, end_time: int, 
                    pic_path: str, description: Optional[str] = None, 
                    number: Optional[int] = None) -> bool:
        """Создание записи о новом кадре"""
        session = self.Session()
        try:
            # Проверяем существование проекта
            project = session.query(Project).filter(Project.id == project_id).first()
            if not project:
                return False
            
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
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error creating frame: {e}")
            return False
        finally:
            session.close()

    def read_frame_info(self, frame_id: int) -> Optional[Dict]:
        """Получение информации о кадре"""
        session = self.Session()
        try:
            frame = session.query(Frame).filter(Frame.id == frame_id).first()
            
            if frame:
                return {
                    'description': frame.description,
                    'start_time': frame.start_time,
                    'end_time': frame.end_time,
                    'pic_path': frame.pic_path,
                    'number': frame.number,
                    'connected_page': frame.connected_page
                }
            return None
            
        except Exception as e:
            print(f"Error reading frame info: {e}")
            return None
        finally:
            session.close()

    def update_frame_info(self, frame_id: int, start_time: Optional[int] = None,
                         end_time: Optional[int] = None, pic_path: Optional[str] = None,
                         description: Optional[str] = None, number: Optional[int] = None) -> bool:
        """Изменение информации о кадре"""
        session = self.Session()
        try:
            print(f"update_frame_info called: frame_id={frame_id}, start_time={start_time}, end_time={end_time}, pic_path={pic_path}, description={(description[:50] + '...') if description and len(description)>50 else description}, number={number}")
            frame = session.query(Frame).filter(Frame.id == frame_id).first()
            
            if not frame:
                print(f"update_frame_info: frame {frame_id} not found")
                return False
            
            if start_time is not None:
                frame.start_time = start_time
            if end_time is not None:
                frame.end_time = end_time
            if pic_path is not None:
                frame.pic_path = pic_path
            if description is not None:
                frame.description = description
            if number is not None:
                frame.number = number
            
            session.commit()
            print(f"update_frame_info: commit successful for frame {frame_id}")
            return True
            
        except Exception as e:
            session.rollback()
            import traceback
            print(f"Error updating frame info for frame {frame_id}: {e}")
            traceback.print_exc()
            return False
        finally:
            session.close()

    def delete_frame(self, frame_id: int) -> bool:
        """Удаление записи о кадре"""
        session = self.Session()
        try:
            frame = session.query(Frame).filter(Frame.id == frame_id).first()
            
            if not frame:
                return False
            
            # Удаляем изображение кадра
            if os.path.exists(frame.pic_path):
                os.remove(frame.pic_path)
            
            # Удаляем запись из БД
            session.delete(frame)
            session.commit()
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error deleting frame: {e}")
            return False
        finally:
            session.close()

    def change_pic(self, frame_id: int, new_pic_path: str) -> bool:
        """Изменение изображения кадра"""
        session = self.Session()
        try:
            frame = session.query(Frame).filter(Frame.id == frame_id).first()
            
            if not frame:
                return False
            
            # Удаляем старое изображение
            if os.path.exists(frame.pic_path):
                os.remove(frame.pic_path)
            
            # Обновляем путь к изображению
            frame.pic_path = new_pic_path
            session.commit()
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error changing picture: {e}")
            return False
        finally:
            session.close()

    def read_pic_path(self, frame_id: int) -> Optional[str]:
        """Получение пути к изображению кадра"""
        session = self.Session()
        try:
            frame = session.query(Frame).filter(Frame.id == frame_id).first()
            return frame.pic_path if frame else None
        finally:
            session.close()

    # ==================== Page Methods ====================

    def create_page(self, project_id: int, number: Optional[int] = None, text: Optional[str] = None) -> bool:
        """Создание записи о новой странице сценария"""
        session = self.Session()
        try:
            # Проверяем существование проекта
            project = session.query(Project).filter(Project.id == project_id).first()
            if not project:
                return False
            
            # Если номер не указан, находим максимальный номер + 1
            if number is None:
                max_number = session.query(Page.number).filter(
                    Page.project_id == project_id
                ).order_by(Page.number.desc()).first()
                number = 1 if not max_number else max_number[0] + 1
            
            new_page = Page(
                project_id=project_id,
                number=number,
                text=text
            )
            
            session.add(new_page)
            session.commit()
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error creating page: {e}")
            return False
        finally:
            session.close()

    def read_page_info(self, page_id: int) -> Optional[Dict]:
        """Получение информации о странице сценария"""
        session = self.Session()
        try:
            page = session.query(Page).filter(Page.id == page_id).first()
            
            if page:
                return {
                    'page_id': page.id,
                    'number': page.number,
                    'text': page.text,
                    'project_id': page.project_id
                }
            return None
            
        except Exception as e:
            print(f"Error reading page info: {e}")
            return None
        finally:
            session.close()

    def update_page_text(self, page_id: int, text: str) -> bool:
        """Изменение текста страницы сценария"""
        session = self.Session()
        try:
            page = session.query(Page).filter(Page.id == page_id).first()
            
            if not page:
                return False
            
            page.text = text
            session.commit()
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error updating page text: {e}")
            return False
        finally:
            session.close()

    def delete_page(self, page_id: int) -> bool:
        """Удаление записи о странице сценария"""
        session = self.Session()
        try:
            page = session.query(Page).filter(Page.id == page_id).first()
            
            if not page:
                return False
            
            session.delete(page)
            session.commit()
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error deleting page: {e}")
            return False
        finally:
            session.close()

    def update_page_number(self, page_id: int, new_page_number: int) -> bool:
        """Изменение номера страницы сценария"""
        session = self.Session()
        try:
            page = session.query(Page).filter(Page.id == page_id).first()
            
            if not page:
                return False
            
            page.number = new_page_number
            session.commit()
            return True
            
        except Exception as e:
            session.rollback()
            print(f"Error updating page number: {e}")
            return False
        finally:
            session.close()





    def get_max_page_number(self, project_id: int) -> int:
        """Получение максимального номера страницы в проекте"""
        session = self.Session()
        try:
            max_number = session.query(Page.number).filter(
                Page.project_id == project_id
            ).order_by(Page.number.desc()).first()
            return max_number[0] if max_number else 0
        finally:
            session.close()

    def get_max_frame_number(self, project_id: int) -> int:
        """Получение максимального номера кадра в проекте"""
        session = self.Session()
        try:
            max_number = session.query(Frame.number).filter(
                Frame.project_id == project_id
            ).order_by(Frame.number.desc()).first()
            return max_number[0] if max_number else 0
        finally:
            session.close()

    def get_user_id_by_login(self, username: str) -> Optional[int]:
        """Получение ID пользователя по логину"""
        session = self.Session()
        try:
            user = session.query(User).filter(User.login == username).first()
            return user.id if user else None
        finally:
            session.close()
