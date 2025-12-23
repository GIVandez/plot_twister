from pydantic import BaseModel, Field
from typing import Optional, List


class DragAndDropFrameRequest(BaseModel):
    frame_id: int = Field(..., gt=0)
    frame_number: int = Field(..., gt=0)


class DeleteImageRequest(BaseModel):
    frame_id: int = Field(..., gt=0)


class FrameInfo(BaseModel):
    frame_id: int
    description: Optional[str]
    start_time: int
    end_time: int
    pic_path: str
    connected: Optional[str]
    number: int


class LoadFramesResponse(BaseModel):
    frames: List[FrameInfo]


class RedoStartTimeRequest(BaseModel):
    frame_id: int = Field(..., gt=0)
    start_time: int


class RedoEndTimeRequest(BaseModel):
    frame_id: int = Field(..., gt=0)
    end_time: int


class NewFrameRequest(BaseModel):
    project_id: int = Field(..., gt=0)
    description: Optional[str] = None
    start_time: int
    end_time: int
    connected: Optional[int] = None


class NewFrameResponse(BaseModel):
    frame_id: int


class DeleteFrameRequest(BaseModel):
    frame_id: int = Field(..., gt=0)


class RedoDescriptionRequest(BaseModel):
    frame_id: int = Field(..., gt=0)
    description: str


class ConnectFrameRequest(BaseModel):
    frame_id: int = Field(..., gt=0)
    page_id: int = Field(..., gt=0)


class DisconnectFrameRequest(BaseModel):
    frame_id: int = Field(..., gt=0)


class FrameTimeUpdate(BaseModel):
    frame_id: int = Field(..., gt=0)
    start_time: int
    end_time: int


class BatchUpdateTimesRequest(BaseModel):
    updates: List[FrameTimeUpdate]
