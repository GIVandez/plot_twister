from pydantic import BaseModel, Field
from fastapi import APIRouter

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
        "1": PageInfo(number=1, text="Текст страницы 1"),
        "2": PageInfo(number=2, text="Текст страницы 2"),
    }
    return {"pages": pages}


@router.delete("/api/page/deletePage")
async def delete_page(request: DeletePageRequest):
    return {"success": True, "page_id": request.page_id}


@router.post("/api/page/redoPage")
async def redo_page(request: RedoPageRequest):
    return {"success": True, "page_id": request.page_id}


@router.post("/api/page/newPage", status_code=201)
async def new_page():
    return NewPageResponse(page_id=1)


@router.get("/api/page/{page_id}/loadPage")
async def load_page(page_id: int):
    return LoadPageResponse(text=f"Текст страницы {page_id}")