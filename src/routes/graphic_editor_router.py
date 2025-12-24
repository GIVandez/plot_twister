from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from project_data_models.graphic_editor_model import GraphicEditorModel
from project_data_models.frame_model import FrameModel
from dto.frame_dto import DeleteImageRequest
import os
import uuid

router = APIRouter()
graphic_editor_model = GraphicEditorModel()
frame_model = FrameModel()


@router.delete("/api/graphic/deleteImage")
async def delete_image(request: DeleteImageRequest):
    """Удаление изображения кадра"""
    try:
        # Проверяем существование кадра
        frame_info = frame_model.get_frame_info(request.frame_id)
        if not frame_info:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Кадр не найден"
            )
        
        # Проверяем наличие изображения
        pic_path = frame_model.get_frame_pic(request.frame_id)
        if not pic_path:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Нет изображения для удаления"
            )
        
        success = frame_model.delete_frame_pic(request.frame_id)
        if not success:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при удалении изображения"
            )
        
        return {"success": True}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.post("/api/graphic/saveImage")
async def save_image(
    frame_id: int = Form(..., gt=0),
    picture: UploadFile = File(...)
):
    """Сохранение результата работы графического редактора"""
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
                detail="Некорректные данные изображения"
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
                detail="Слишком большой размер изображения"
            )
        
        with open(file_path, 'wb') as f:
            f.write(content)
        
        # Обновляем путь к изображению в БД
        success = graphic_editor_model.upload_pic(frame_id, file_path, content)
        if not success:
            # Удаляем файл, если не удалось сохранить в БД
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Ошибка при сохранении файла"
            )
        
        return {"success": True, "path": file_path}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Внутренняя ошибка сервера: {str(e)}"
        )


@router.get("/api/graphic/{pic_path}/loadImage")
async def load_image(pic_path: str):
    """Загрузка изображения в редактор"""
    try:
        # Проверяем существование файла
        if not os.path.exists(pic_path):
            # Пробуем с префиксом uploads/
            full_path = os.path.join("uploads", pic_path) if not pic_path.startswith("uploads/") else pic_path
            if not os.path.exists(full_path):
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Изображение не найдено по указанному пути"
                )
            pic_path = full_path
        
        if not os.path.exists(pic_path):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Изображение не найдено по указанному пути"
            )
        
        return FileResponse(pic_path)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Ошибка при чтении файла: {str(e)}"
        )


# TODO: API?

@router.get("/graphic-editor")
async def load_start_page():
    # Используем абсолютный путь относительно текущего файла
    current_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    file_path = os.path.join(current_dir, "static", "graphiceditor", "GraphicEditor.html")
    return FileResponse(path=file_path)