from pydantic import BaseModel, Field
from fastapi import APIRouter, UploadFile, File, Form
from fastapi.responses import FileResponse
import os

router = APIRouter()


class ImageResponse(BaseModel):
    success: bool = True
    message: str = "Success"
    frame_id: int
    path: str


@router.post("/api/graphic/saveImage")
async def save_image(
    frame_id: int = Form(..., gt=0),  # Валидация: > 0
    picture: UploadFile = File(...)   # Валидация: файл обязателен
):
    """Сохранение изображения с Pydantic валидацией"""
    os.makedirs("uploads", exist_ok=True)
    
    file_path = f"uploads/frame_{frame_id}.jpg"
    with open(file_path, "wb") as f:
        f.write(await picture.read())
    
    return ImageResponse(
        frame_id=frame_id,
        path=file_path
    )


@router.get("/api/graphic/{pic_path}/loadImage")
async def load_image(pic_path: str = Field(..., min_length=1)):
    """Загрузка изображения с Pydantic валидацией пути"""
    full_path = f"uploads/{pic_path}" if not os.path.exists(pic_path) else pic_path
    
    if os.path.exists(full_path):
        return FileResponse(full_path)
    return {"error": "Not found", "path": pic_path}