from pydantic import BaseModel, Field
from typing import Dict


class PageInfo(BaseModel):
    number: int
    text: str


class LoadPagesResponse(BaseModel):
    pages: Dict[str, PageInfo]


class DeletePageRequest(BaseModel):
    page_id: int = Field(..., gt=0)


class RedoPageRequest(BaseModel):
    page_id: int = Field(..., gt=0)
    text: str


class NewPageResponse(BaseModel):
    page_id: int


class LoadPageResponse(BaseModel):
    text: str
