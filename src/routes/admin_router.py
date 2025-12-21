from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from dto.admin_dto import (
    DropAdminRequest, DeleteAdminProjectRequest, LoadUsersAccountsResponse,
    UserInfo, DeleteAccountRequest, UpgradeAccountRequest
)
from user_models.admin_model import AdminModel
from project_data_models.project_model import ProjectModel
from database.repository import DatabaseRepository
from database.base import engine
from database.models import User
from sqlalchemy.orm import sessionmaker

router = APIRouter()
admin_model = AdminModel()
project_model = ProjectModel()
db_repo = DatabaseRepository()
Session = sessionmaker(bind=engine)


@router.delete("/api/admin/dropAdmin")
async def drop_admin(request: DropAdminRequest):
    """Снятие роли администратора"""
    try:
        # Проверяем существование пользователя
        if not db_repo.user_exist(request.login):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Получаем информацию о пользователе
        user_info = db_repo.read_user_info(request.login)
        if user_info and user_info.get('role') != 'admin':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь не является администратором"
            )
        
        # Получаем ID пользователя
        user_id = db_repo.get_user_id_by_login(request.login)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        success = admin_model.remove_admin_role(user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при снятии роли администратора"
            )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.delete("/api/admin/project/deleteProject")
async def admin_delete_project(request: DeleteAdminProjectRequest):
    """Удаление админом проекта"""
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


@router.get("/api/admin/user/loadUsersAccounts", response_model=LoadUsersAccountsResponse)
async def load_users_accounts():
    """Загрузка аккаунтов всех пользователей веб-приложения"""
    try:
        session = Session()
        try:
            users = session.query(User).all()
            
            if not users:
                raise HTTPException(
                    status_code=status.HTTP_204_NO_CONTENT,
                    detail="Пользователи не найдены"
                )
            
            user_list = [UserInfo(login=user.login) for user in users]
            return LoadUsersAccountsResponse(users=user_list)
        finally:
            session.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.delete("/api/admin/user/deleteAccount")
async def admin_delete_account(request: DeleteAccountRequest):
    """Удаление админом пользователя"""
    try:
        # Проверяем существование пользователя
        if not db_repo.user_exist(request.login):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # TODO: Добавить проверку, что нельзя удалить самого себя
        # Для этого нужно получать текущего пользователя из токена
        
        success = admin_model.delete_user(request.login)
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


@router.post("/api/admin/user/upgradeAccount")
async def upgrade_account(request: UpgradeAccountRequest):
    """Повышение пользователя до администратора"""
    try:
        # Проверяем существование пользователя
        if not db_repo.user_exist(request.login):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        # Проверяем, не является ли пользователь уже администратором
        user_info = db_repo.read_user_info(request.login)
        if user_info and user_info.get('role') == 'admin':
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пользователь уже является администратором"
            )
        
        # Получаем ID пользователя
        user_id = db_repo.get_user_id_by_login(request.login)
        if not user_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Пользователь не найден"
            )
        
        success = admin_model.give_admin_role(user_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при повышении до администратора"
            )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.get("/admin_test")
async def load_start_page():
    return FileResponse(path="static/admin/api_test.html")