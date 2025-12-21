from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse
from dto.page_dto import (
    PageInfo, LoadPagesResponse, DeletePageRequest, RedoPageRequest,
    NewPageResponse, LoadPageResponse, NewPageRequest
)
from project_data_models.page_model import PageModel
from database.repository import DatabaseRepository
from typing import Dict

router = APIRouter()
page_model = PageModel()
db_repo = DatabaseRepository()


@router.get("/api/page/{project_id}/loadPages", response_model=LoadPagesResponse)
async def load_pages(project_id: int):
    """Загрузка страниц проекта"""
    try:
        # Проверяем существование проекта
        project_info = db_repo.read_project_info(project_id)
        if not project_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден"
            )
        
        # Получаем все страницы проекта
        from database.base import engine
        from database.models import Page
        from sqlalchemy.orm import sessionmaker
        
        Session = sessionmaker(bind=engine)
        session = Session()
        try:
            pages = session.query(Page).filter(Page.project_id == project_id).order_by(Page.number).all()
            
            if not pages:
                raise HTTPException(
                    status_code=status.HTTP_204_NO_CONTENT,
                    detail="В проекте нет страниц"
                )
            
            pages_dict: Dict[str, PageInfo] = {}
            for page in pages:
                pages_dict[str(page.id)] = PageInfo(
                    number=page.number,
                    text=page.text or ""
                )
            
            return LoadPagesResponse(pages=pages_dict)
        finally:
            session.close()
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.delete("/api/page/deletePage")
async def delete_page(request: DeletePageRequest):
    """Удаление страницы из сценария"""
    try:
        page_info = page_model.get_page(request.page_id)
        if not page_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Страница не найдена"
            )
        
        success = page_model.delete_page(request.page_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при удалении страницы"
            )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/page/redoPage")
async def redo_page(request: RedoPageRequest):
    """Редактирование страницы из сценария"""
    try:
        if not request.text:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пустой текст"
            )
        
        page_info = page_model.get_page(request.page_id)
        if not page_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Страница не найдена"
            )
        
        success = page_model.edit_page(request.page_id, {'text': request.text})
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при обновлении страницы"
            )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/page/newPage", status_code=status.HTTP_201_CREATED, response_model=NewPageResponse)
async def new_page(request: NewPageRequest = None):
    """Создание страницы в сценарии"""
    try:
        if request is None or request.project_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="project_id не указан"
            )
        
        project_id = request.project_id
        
        # Проверяем существование проекта
        project_info = db_repo.read_project_info(project_id)
        if not project_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден"
            )
        
        page_id = page_model.new_page(project_id)
        if page_id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при создании страницы"
            )
        
        return NewPageResponse(page_id=page_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.get("/api/page/{page_id}/loadPage", response_model=LoadPageResponse)
async def load_page(page_id: int):
    """Загрузка текста страницы"""
    try:
        page_info = page_model.get_page(page_id)
        if not page_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Страница не найдена"
            )
        
        return LoadPageResponse(text=page_info.get('text', ''))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.get("/page_test")
async def load_start_page():
    return FileResponse(path="static/script/api_test.html")