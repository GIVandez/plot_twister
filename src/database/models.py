from sqlalchemy import Column, Integer, String, Text, ForeignKey, CheckConstraint
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship

# Создаем базовый класс для моделей
Base = declarative_base()

# Модели таблиц
class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    login = Column(String(50), unique=True, nullable=False)
    password = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False, default='user')
    
    # Связи
    projects = relationship("Project", back_populates="owner_user", cascade="all, delete-orphan")


class Project(Base):
    __tablename__ = 'project'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(100), nullable=False)
    owner = Column(Integer, ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    
    # Связи
    owner_user = relationship("User", back_populates="projects")
    pages = relationship("Page", back_populates="project_rel", cascade="all, delete-orphan")
    frames = relationship("Frame", back_populates="project_rel", cascade="all, delete-orphan")


class Page(Base):
    __tablename__ = 'page'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id', ondelete='CASCADE'), nullable=False)
    number = Column(Integer, nullable=False)
    text = Column(Text)
    
    # Ограничения
    __table_args__ = (
        CheckConstraint('number > 0', name='check_page_number_positive'),
    )
    
    # Связи
    project_rel = relationship("Project", back_populates="pages")
    connected_frames = relationship("Frame", back_populates="connected_page_rel")


class Frame(Base):
    __tablename__ = 'frame'
    
    id = Column(Integer, primary_key=True)
    project_id = Column(Integer, ForeignKey('project.id', ondelete='CASCADE'), nullable=False)
    description = Column(Text)
    start_time = Column(Integer, nullable=False)
    end_time = Column(Integer, nullable=False)
    pic_path = Column(String(500), nullable=False)
    connected_page = Column(Integer, ForeignKey('page.id', ondelete='SET NULL'))
    number = Column(Integer, nullable=False)
    
    # Ограничения
    __table_args__ = (
        CheckConstraint('start_time >= 0', name='check_start_time_positive'),
        CheckConstraint('end_time >= start_time', name='check_end_time_gte_start_time'),
        CheckConstraint('number > 0', name='check_frame_number_positive'),
    )
    
    # Связи
    project_rel = relationship("Project", back_populates="frames")
    connected_page_rel = relationship("Page", back_populates="connected_frames")