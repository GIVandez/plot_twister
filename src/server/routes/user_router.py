from pydantic import BaseModel
from fastapi import APIRouter
from fastapi.responses import FileResponse

from random import randint

router = APIRouter()


class ProjectInfo(BaseModel):
    project_id: int
    project_name: str


class CreateProjectRequest(BaseModel):
    name: str
    login: str


class UpdateProjectInfoRequest(BaseModel):
    project_id: int
    name: str


class DeleteUserRequest(BaseModel):
    login: str


class DeleteProjectRequest(BaseModel):
    project_id: int


@router.get("/api/users/{user_name}/loadInfo")
async def load_user_info(user_name: str):
    projects = [
        {"project_id": randint(0, 10000), "project_name": "Проект 1"},
        {"project_id": randint(0, 10000), "project_name": "Проект 2"}
    ]
    return {"projects": projects}


@router.post("/api/user/createProject", status_code=201)
async def create_project(request: CreateProjectRequest):
    return {"project_id": randint(0, 10000)}


@router.post("/api/user/updateProjectInfo")
async def update_project_info(request: UpdateProjectInfoRequest):
    return {"success": True}


@router.delete("/api/user/deleteUser")
async def delete_user(request: DeleteUserRequest):
    return {"success": True}


@router.delete("/api/user/deleteProject")
async def delete_project(request: DeleteProjectRequest):
    return {"success": True}



@router.get("/user_test")
async def load_start_page():
    return FileResponse(path="static/account/index.html")
