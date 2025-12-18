from pydantic import BaseModel, Field
from typing import Optional
from fastapi import UploadFile, File, Form
from fastapi.responses import FileResponse

from fastapi import APIRouter

router = APIRouter()



class DragAndDropFrameRequest(BaseModel):
    frame_id: int = Field(..., gt=0)
    frame_number: int = Field(..., gt=0)

class DeleteImageRequest(BaseModel):
    frame_id: int = Field(..., gt=0)

class FrameInfo(BaseModel):
    frame_id: int
    description: str
    start_time: int
    end_time: int
    pic_path: str
    connected: str
    number: int

class RedoStartTimeRequest(BaseModel):
    frame_id: int = Field(..., gt=0)
    start_time: int

class RedoEndTimeRequest(BaseModel):
    frame_id: int = Field(..., gt=0)
    end_time: int

class NewFrameRequest(BaseModel):
    project_id: int = Field(..., gt=0)
    description: str
    start_time: int
    end_time: int
    connected_page_id: Optional[int] = None

class NewFrameResponse(BaseModel):
    frame_id: int

class DeleteFrameRequest(BaseModel):
    frame_id: int = Field(..., gt=0)

class RedoDescriptionRequest(BaseModel):
    frame_id: int = Field(..., gt=0)
    description: str



@router.post("/api/frame/redoStartTime")
async def redo_start_time(request: RedoStartTimeRequest):
    return {"success": True, "frame_id": request.frame_id}


@router.post("/api/frame/dragAndDropFrame")
async def drag_and_drop_frame(request: DragAndDropFrameRequest):
    return {"success": True, "frame_id": request.frame_id}

@router.get("/api/frame/{project_id}/loadFrames")
async def load_frames(project_id: int):
    frames = [
        FrameInfo(
            frame_id=1,
            description="Кадр 1",
            start_time=0,
            end_time=73,
            pic_path="/path/to/image.jpg",
            connected="",
            number=1
        )
    ]
    return {"frames": frames}


@router.post("/api/frame/redoEndTime")
async def redo_end_time(request: RedoEndTimeRequest):
    return {"success": True}

@router.post("/api/frame/newFrame", status_code=201)
async def new_frame(request: NewFrameRequest):
    return NewFrameResponse(frame_id=1)

@router.delete("/api/frame/deleteFrame")
async def delete_frame(request: DeleteFrameRequest):
    return {"success": True}

@router.post("/api/frame/redoDescription")
async def redo_description(request: RedoDescriptionRequest):
    return {"success": True}

@router.post("/api/frame/uploadImage")
async def upload_image(frame_id: int = Form(...), picture: UploadFile = File(...)):
    return {"success": True}



@router.get("/")
async def load_start_page():
    return FileResponse(path="static/storyboard/index.html")
