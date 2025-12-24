from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from dto.project_dto import (
    LoadProjectsResponse, ProjectInfo,
    CreateProjectRequest, CreateProjectResponse,
    UpdateProjectRequest, DeleteProjectRequest,
    DeleteScriptRequest, DeleteFramesRequest,
    ConnectFramePageRequest, DisconnectFramePageRequest
)
from project_data_models.project_model import ProjectModel
import os
from database.repository import DatabaseRepository
from typing import List

router = APIRouter()
project_model = ProjectModel()
db_repo = DatabaseRepository()


@router.get("/api/users/{user_name}/loadInfo", response_model=LoadProjectsResponse)
async def load_user_projects(user_name: str):
    """Загрузка личного кабинета пользователя (списка проектов)"""
    try:
        # Проверяем существование пользователя
        user_info = db_repo.read_user_info(user_name)
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Получаем проекты пользователя
        from database.base import engine
        from database.models import Project, User
        from sqlalchemy.orm import sessionmaker
        
        Session = sessionmaker(bind=engine)
        session = Session()
        try:
            # Получаем пользователя
            user = session.query(User).filter(User.login == user_name).first()
            if not user:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Пользователь не найден"
                )
            
            # Получаем проекты пользователя
            projects = session.query(Project).filter(Project.owner == user.id).all()
            
            if not projects:
                raise HTTPException(
                    status_code=status.HTTP_204_NO_CONTENT,
                    detail="У пользователя нет проектов"
                )
            
            # Формируем ответ
            projects_list: List[ProjectInfo] = []
            for project in projects:
                projects_list.append(ProjectInfo(
                    project_id=project.id,
                    project_name=project.name
                ))
            
            return LoadProjectsResponse(projects=projects_list)
            
        finally:
            session.close()
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/user/createProject", status_code=status.HTTP_201_CREATED, response_model=CreateProjectResponse)
async def create_project(request: CreateProjectRequest):
    """Создание нового проекта пользователя"""
    try:
        # Проверяем входные данные
        if not request.name or not request.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пустое название проекта"
            )
        
        if not request.login or not request.login.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Логин не указан"
            )
        
        # Проверяем существование пользователя
        user_info = db_repo.read_user_info(request.login)
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Проверяем, не существует ли уже проект с таким названием у пользователя
        if db_repo.user_project_exist(request.name, request.login):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Проект с таким названием у пользователя уже существует"
            )
        
        # Создаем проект
        project_id = project_model.new_project(request.login, request.name)
        if project_id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при создании проекта"
            )
        
        return CreateProjectResponse(project_id=project_id)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/user/updateProjectInfo")
async def update_project_info(request: UpdateProjectRequest):
    """Изменение информации о проекте"""
    try:
        # Проверяем входные данные
        if not request.name or not request.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Некорректные данные для обновления"
            )
        
        # Проверяем существование проекта
        project_info = db_repo.read_project_info(request.project_id)
        if not project_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден"
            )
        
        # Обновляем название проекта
        success = project_model.edit_project_name(request.project_id, request.name)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при обновлении проекта"
            )
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.delete("/api/user/deleteProject")
async def delete_user_project(request: DeleteProjectRequest):
    """Удаление пользователем проекта"""
    try:
        # Проверяем существование проекта
        project_info = db_repo.read_project_info(request.project_id)
        if not project_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден"
            )
        
        # Удаляем проект
        success = project_model.delete_project(request.project_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при удалении проекта"
            )
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.delete("/api/user/deleteScript")
async def delete_script(request: DeleteScriptRequest):
    """Удаление сценария проекта (всех страниц)"""
    try:
        # Проверяем существование проекта
        project_info = db_repo.read_project_info(request.project_id)
        if not project_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден"
            )
        
        # Удаляем сценарий
        success = project_model.delete_script(request.project_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при удалении сценария"
            )
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.delete("/api/user/deleteFrames")
async def delete_frames(request: DeleteFramesRequest):
    """Удаление раскадровки проекта (всех кадров)"""
    try:
        # Проверяем существование проекта
        project_info = db_repo.read_project_info(request.project_id)
        if not project_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден"
            )
        
        # Удаляем раскадровку
        success = project_model.delete_frames(request.project_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при удалении раскадровки"
            )
        
        return {"success": True}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/frame/connectFrame")
async def connect_frame_page(request: ConnectFramePageRequest):
    """Связь кадра и страницы"""
    try:
        # Проверяем входные данные
        if not request.frame_id or not request.page_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный формат данных (отсутствуют или некорректные frame_id/page_id)"
            )
        
        # Проверяем существование кадра
        from database.base import engine
        from database.models import Frame, Page
        from sqlalchemy.orm import sessionmaker
        
        Session = sessionmaker(bind=engine)
        session = Session()
        try:
            frame = session.query(Frame).filter(Frame.id == request.frame_id).first()
            page = session.query(Page).filter(Page.id == request.page_id).first()
            
            if not frame:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Кадр не найден"
                )
            
            if not page:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Страница не найдена"
                )
            
            # Проверяем, что кадр и страница из одного проекта
            if frame.project_id != page.project_id:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="Невозможно связать кадр со страницей из другого проекта"
                )
            
            # Проверяем, не связан ли кадр уже с другой страницей
            if frame.connected_page is not None and frame.connected_page != request.page_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Кадр уже связан с другой страницей"
                )
            
        finally:
            session.close()
        
        # Связываем кадр и страницу
        success = project_model.connect_fp(request.frame_id, request.page_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при установке связи"
            )
        
        return {"success": True, "message": "Связь установлена"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/frame/disconnectFrame")
async def disconnect_frame_page(request: DisconnectFramePageRequest):
    """Удаление связи кадра и страницы"""
    try:
        # Проверяем входные данные
        if not request.frame_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неверный формат данных (отсутствует frame_id)"
            )
        
        # Проверяем существование кадра
        from database.base import engine
        from database.models import Frame
        from sqlalchemy.orm import sessionmaker
        
        Session = sessionmaker(bind=engine)
        session = Session()
        try:
            frame = session.query(Frame).filter(Frame.id == request.frame_id).first()
            
            if not frame:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Кадр не найден"
                )
            
            # Если кадр не связан со страницей
            if frame.connected_page is None:
                return {"success": True, "message": "Связи не существовало"}
            
        finally:
            session.close()
        
        # Разрываем связь кадра и страницы
        success = project_model.disconnect_fp(request.frame_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при удалении связи"
            )
        
        return {"success": True, "message": "Связь удалена"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )



@router.get("/project_test")
async def load_start_page():
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(current_dir, "static", "project", "api_test.html")
    return FileResponse(path=file_path)


# TODO: API?

@router.get("/project")
async def load_start_page():
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(current_dir, "static", "project", "ProjectMainPage.html")
    return FileResponse(path=file_path)
