from pydantic import BaseModel, Field
from fastapi import APIRouter
from fastapi.responses import FileResponse

from random import randint

router = APIRouter()


class PageInfo(BaseModel):
    number: int
    text: str


class DeletePageRequest(BaseModel):
    page_id: int = Field(..., gt=0)


class RedoPageRequest(BaseModel):
    page_id: int = Field(..., gt=0)
    text: str


class NewPageResponse(BaseModel):
    page_id: int


class LoadPageResponse(BaseModel):
    text: str


@router.get("/api/page/{project_id}/loadPages")
async def load_pages(project_id: int):
    pages = {
        randint(0, 10000): PageInfo(number=1, text="Текст страницы 1"),
        randint(0, 10000): PageInfo(number=2, text="Текст страницы 2"),
    }
    return {"pages": pages}


@router.delete("/api/page/deletePage")
async def delete_page(request: DeletePageRequest):
    return {"success": True}


@router.post("/api/page/redoPage")
async def redo_page(request: RedoPageRequest):
    return {"success": True}


@router.post("/api/page/newPage", status_code=201)
async def new_page():
    return NewPageResponse(page_id=randint(0, 10000))


@router.get("/api/page/{page_id}/loadPage")
async def load_page(page_id: int):
    return LoadPageResponse(text=f"Текст страницы {page_id}")




@router.get("/page_test")
async def load_start_page():
    return FileResponse(path="static/script/api_test.html")
