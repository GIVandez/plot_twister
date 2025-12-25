from pydantic import BaseModel
from typing import List


class ProjectInfo(BaseModel):
    project_id: int
    project_name: str


class LoadUserInfoResponse(BaseModel):
    projects: List[ProjectInfo]


class CreateProjectRequest(BaseModel):
    name: str
    login: str


class CreateProjectResponse(BaseModel):
    project_id: int


class UpdateProjectInfoRequest(BaseModel):
    project_id: int
    name: str


class DeleteUserRequest(BaseModel):
    login: str


class DeleteProjectRequest(BaseModel):
    project_id: int


class UserInfoResponse(BaseModel):
    username: str
    role: str
