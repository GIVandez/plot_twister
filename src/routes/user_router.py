from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from dto.user_dto import (
    LoadUserInfoResponse, ProjectInfo, CreateProjectRequest, CreateProjectResponse,
    UpdateProjectInfoRequest, DeleteUserRequest, DeleteProjectRequest
)
from dto.user_dto import UserInfoResponse
from user_models.user_model import UserModel
from project_data_models.project_model import ProjectModel
from database.repository import DatabaseRepository
import os

router = APIRouter()
user_model = UserModel()
project_model = ProjectModel()
db_repo = DatabaseRepository()


@router.get("/api/users/{user_name}/loadInfo", response_model=LoadUserInfoResponse)
async def load_user_info(user_name: str):
    """Загрузка личного кабинета пользователя"""
    try:
        # Проверяем существование пользователя
        user_info = user_model.get_user_info(user_name)
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Получаем список проектов
        projects = user_model.get_user_projects(user_name)
        
        if not projects:
            raise HTTPException(
                status_code=status.HTTP_204_NO_CONTENT,
                detail="У пользователя нет проектов"
            )
        
        # Получаем полную информацию о проектах
        project_list = []
        for project_name in projects:
            # Получаем информацию о проекте
            user_projects = db_repo.read_user_projects(user_name)
            for proj in user_projects:
                if proj['project_name'] == project_name:
                    project_list.append(ProjectInfo(
                        project_id=proj['project_id'],
                        project_name=proj['project_name']
                    ))
                    break
        
        return LoadUserInfoResponse(projects=project_list)
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
        if not request.name or not request.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пустое название проекта"
            )
        
        # Проверяем существование пользователя
        if not db_repo.user_exist(request.login):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Проверяем, не существует ли уже проект с таким названием
        if db_repo.user_project_exist(request.name, request.login):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Проект с таким названием у пользователя уже существует"
            )
        
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


@router.get("/api/users/{user_name}/info", response_model=UserInfoResponse)
async def get_user_info(user_name: str):
    """Return basic user info including role"""
    try:
        user_info = user_model.get_user_info(user_name)
        if not user_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        return UserInfoResponse(username=user_info.get('username'), role=user_info.get('role', 'user'))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/user/updateProjectInfo")
async def update_project_info(request: UpdateProjectInfoRequest):
    """Изменение информации о проекте"""
    try:
        # Проверяем существование проекта
        project_info = db_repo.read_project_info(request.project_id)
        if not project_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден"
            )
        
        if not request.name or not request.name.strip():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Некорректные данные для обновления"
            )
        
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


@router.delete("/api/user/deleteUser")
async def delete_user(request: DeleteUserRequest):
    """Удаление пользователем аккаунта пользователя"""
    try:
        # Проверяем существование пользователя
        if not db_repo.user_exist(request.login):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Проверяем наличие активных проектов
        projects = user_model.get_user_projects(request.login)
        if projects:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="У пользователя есть активные проекты"
            )
        
        success = user_model.delete_user(request.login)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при удалении пользователя"
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
async def delete_project(request: DeleteProjectRequest):
    """Удаление пользователем проекта"""
    try:
        # Проверяем существование проекта
        project_info = db_repo.read_project_info(request.project_id)
        if not project_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден"
            )
        
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


@router.get("/user_test")
async def load_start_page():
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(current_dir, "static", "account", "api_test.html")
    return FileResponse(path=file_path)


# TODO: API?

@router.get("/user")
async def load_start_page():
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(current_dir, "static", "account", "account.html")
    return FileResponse(path=file_path)
