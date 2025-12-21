# project_dto.py - полностью переписываем файл
from pydantic import BaseModel
from typing import List


class ProjectInfo(BaseModel):
    """Информация о проекте"""
    project_id: int
    project_name: str


class LoadProjectsResponse(BaseModel):
    """Ответ на загрузку проектов пользователя"""
    projects: List[ProjectInfo]


class CreateProjectRequest(BaseModel):
    """Запрос на создание проекта"""
    name: str
    login: str


class CreateProjectResponse(BaseModel):
    """Ответ на создание проекта"""
    project_id: int


class UpdateProjectRequest(BaseModel):
    """Запрос на обновление информации о проекте"""
    project_id: int
    name: str


class DeleteProjectRequest(BaseModel):
    """Запрос на удаление проекта"""
    project_id: int


class DeleteScriptRequest(BaseModel):
    """Запрос на удаление сценария проекта"""
    project_id: int


class DeleteFramesRequest(BaseModel):
    """Запрос на удаление раскадровки проекта"""
    project_id: int


class ConnectFramePageRequest(BaseModel):
    """Запрос на связывание кадра и страницы"""
    frame_id: int
    page_id: int


class DisconnectFramePageRequest(BaseModel):
    """Запрос на разрыв связи кадра и страницы"""
    frame_id: int