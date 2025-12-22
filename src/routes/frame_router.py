from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from dto.frame_dto import (
    DragAndDropFrameRequest, DeleteImageRequest, FrameInfo, LoadFramesResponse,
    RedoStartTimeRequest, RedoEndTimeRequest, NewFrameRequest, NewFrameResponse,
    DeleteFrameRequest, RedoDescriptionRequest, ConnectFrameRequest, DisconnectFrameRequest
)
from project_data_models.frame_model import FrameModel
from project_data_models.project_model import ProjectModel
from database.repository import DatabaseRepository
import os
import uuid

router = APIRouter()
frame_model = FrameModel()
project_model = ProjectModel()
db_repo = DatabaseRepository()


@router.post("/api/frame/dragAndDropFrame")
async def drag_and_drop_frame(request: DragAndDropFrameRequest):
    """Перетаскивание кадра в списке кадров"""
    try:
        # Получаем информацию о кадре
        frame_info = frame_model.get_frame_info(request.frame_id)
        if not frame_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кадр не найден"
            )
        
        # Получаем project_id из кадра (предполагаем, что frame_info содержит project_id)
        # Если нет, нужно добавить в get_frame_info или получить отдельно
        # Для простоты, добавим метод в model
        
        # Реализуем логику изменения номера кадра и пересчета номеров других кадров
        success = frame_model.reorder_frames_by_frame_id(request.frame_id, request.frame_number)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при изменении порядка кадров"
            )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/frame/updateNumber")
async def update_frame_number(request: DragAndDropFrameRequest):
    """Обновление порядкового номера одного кадра (использует reorder для избежания конфликта unique constraint)"""
    try:
        print(f"update_frame_number called: {request.frame_id} -> {request.frame_number}")
        frame_info = frame_model.get_frame_info(request.frame_id)
        if not frame_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кадр не найден"
            )

        # Используем reorder_frames_by_frame_id для корректного обновления с учётом UNIQUE constraint
        success = frame_model.reorder_frames_by_frame_id(request.frame_id, request.frame_number)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при обновлении номера кадра"
            )

        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.get("/api/frame/{project_id}/loadFrames", response_model=LoadFramesResponse)
async def load_frames(project_id: int):
    """Загрузка кадров проекта пользователя"""
    try:
        # Проверяем существование проекта
        project_info = db_repo.read_project_info(project_id)
        if not project_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден"
            )
        
        frames = frame_model.get_project_frames(project_id)
        
        if not frames:
            raise HTTPException(
                status_code=status.HTTP_204_NO_CONTENT,
                detail="В проекте нет кадров"
            )
        
        frame_info_list = [FrameInfo(**frame) for frame in frames]
        return LoadFramesResponse(frames=frame_info_list)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/frame/redoStartTime")
async def redo_start_time(request: RedoStartTimeRequest):
    """Изменение начала времени кадра"""
    try:
        frame_info = frame_model.get_frame_info(request.frame_id)
        if not frame_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кадр не найден"
            )
        
        # Проверяем, что новое время начала не позже времени конца
        if request.start_time > frame_info['end_time']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Новое время начала позже времени конца кадра"
            )
        
        success = frame_model.edit_frame_info(request.frame_id, {'start_time': request.start_time})
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при обновлении времени начала кадра"
            )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/frame/redoEndTime")
async def redo_end_time(request: RedoEndTimeRequest):
    """Изменение конца времени кадра"""
    try:
        frame_info = frame_model.get_frame_info(request.frame_id)
        if not frame_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кадр не найден"
            )
        
        # Проверяем, что новое время конца не раньше времени начала
        if request.end_time < frame_info['start_time']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Новое время конца раньше времени начала кадра"
            )
        
        success = frame_model.edit_frame_info(request.frame_id, {'end_time': request.end_time})
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при обновлении времени конца кадра"
            )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/frame/newFrame", status_code=status.HTTP_201_CREATED, response_model=NewFrameResponse)
async def new_frame(request: NewFrameRequest):
    """Создание кадра в раскадровке"""
    try:
        # Проверяем валидность временных интервалов
        if request.start_time >= request.end_time:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Время начала позже времени конца или некорректный связанный кадр"
            )
        
        # Проверяем существование проекта
        project_info = db_repo.read_project_info(request.project_id)
        if not project_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Проект не найден"
            )
        
        # Создаем временный путь для изображения (пустой по умолчанию)
        frame_data = {
            'project_id': request.project_id,
            'description': request.description,
            'start_time': request.start_time,
            'end_time': request.end_time,
            'pic_path': f'/uploads/frame_{uuid.uuid4()}.jpg',  # Временный путь
            'connected': request.connected
        }
        
        frame_id = frame_model.new_frame("", frame_data)  # username не используется в new_frame
        
        if frame_id is None:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при создании кадра"
            )
        
        # Если указан connected (page_id), связываем кадр со страницей
        if request.connected is not None:
            project_model.connect_fp(frame_id, request.connected)
        
        return NewFrameResponse(frame_id=frame_id)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.delete("/api/frame/deleteFrame")
async def delete_frame(request: DeleteFrameRequest):
    """Удаление кадра из раскадровки"""
    try:
        frame_info = frame_model.get_frame_info(request.frame_id)
        if not frame_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кадр не найден"
            )
        
        success = frame_model.delete_frame(request.frame_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при удалении кадра"
            )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/frame/redoDescription")
async def redo_description(request: RedoDescriptionRequest):
    """Изменение описания кадра"""
    try:
        if not request.description:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Пустое описание"
            )
        
        frame_info = frame_model.get_frame_info(request.frame_id)
        if not frame_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кадр не найден"
            )
        
        success = frame_model.edit_frame_info(request.frame_id, {'description': request.description})
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при обновлении описания кадра"
            )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/frame/uploadImage")
async def upload_image(frame_id: int = Form(...), picture: UploadFile = File(...)):
    """Загрузка изображения"""
    try:
        # Проверяем существование кадра
        frame_info = frame_model.get_frame_info(frame_id)
        if not frame_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кадр не найден"
            )
        
        # Проверяем формат файла
        if picture.content_type not in ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Неподдерживаемый формат изображения"
            )
        
        # Создаем директорию для загрузок, если её нет
        upload_dir = "uploads"
        os.makedirs(upload_dir, exist_ok=True)
        
        # Генерируем путь к файлу
        file_extension = os.path.splitext(picture.filename)[1] or '.jpg'
        file_path = os.path.join(upload_dir, f"frame_{frame_id}_{uuid.uuid4()}{file_extension}")
        
        # Сохраняем файл
        content = await picture.read()
        if len(content) > 10 * 1024 * 1024:  # 10MB
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Слишком большой размер файла"
            )
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Обновляем путь к изображению в БД
        success = frame_model.upload_frame_pic(frame_id, file_path, content)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при сохранении изображения"
            )
        
        return {"success": True, "path": file_path}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/frame/connectFrame")
async def connect_frame(request: ConnectFrameRequest):
    """Связь кадра и страницы"""
    try:
        # Проверяем существование кадра
        frame_info = frame_model.get_frame_info(request.frame_id)
        if not frame_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кадр не найден"
            )
        
        # Проверяем существование страницы
        from database.repository import DatabaseRepository
        db = DatabaseRepository()
        page_info = db.read_page_info(request.page_id)
        if not page_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Страница не найдена"
            )
        
        # Получаем project_id кадра из БД
        from database.base import engine
        from database.models import Frame
        from sqlalchemy.orm import sessionmaker
        Session = sessionmaker(bind=engine)
        session = Session()
        try:
            frame_obj = session.query(Frame).filter(Frame.id == request.frame_id).first()
            frame_project_id = frame_obj.project_id if frame_obj else None
        finally:
            session.close()
        
        # Проверяем, что кадр и страница принадлежат одному проекту
        if frame_project_id != page_info.get('project_id'):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Невозможно связать кадр со страницей из другого проекта"
            )
        
        success = project_model.connect_fp(request.frame_id, request.page_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при установке связи"
            )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/frame/disconnectFrame")
async def disconnect_frame(request: DisconnectFrameRequest):
    """Удаление связи кадра и страницы"""
    try:
        frame_info = frame_model.get_frame_info(request.frame_id)
        if not frame_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кадр не найден"
            )
        
        success = project_model.disconnect_fp(request.frame_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при удалении связи"
            )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.get("/frame_test")
async def load_start_page():
    return FileResponse(path="static/storyboard/api_test.html")