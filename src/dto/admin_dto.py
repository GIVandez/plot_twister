from pydantic import BaseModel
from typing import List


class DropAdminRequest(BaseModel):
    login: str


class DeleteAdminProjectRequest(BaseModel):
    project_id: int


class UserInfo(BaseModel):
    login: str
    email: str | None = None


class LoadUsersAccountsResponse(BaseModel):
    users: List[UserInfo]


class DeleteAccountRequest(BaseModel):
    login: str


class UpgradeAccountRequest(BaseModel):
    login: str
