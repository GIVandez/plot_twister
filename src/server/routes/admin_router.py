from pydantic import BaseModel
from fastapi import APIRouter
from fastapi.responses import FileResponse

from random import randint



router = APIRouter()


class DropAdminRequest(BaseModel):
    login: str

class DeleteAdminProjectRequest(BaseModel):
    project_id: int



@router.delete("/api/admin/dropAdmin")
async def drop_admin(request: DropAdminRequest):
    return {"success": True, "login": request.login}


@router.delete("/api/admin/project/deleteProject")
async def admin_delete_project(request: DeleteAdminProjectRequest):
    return {"success": True}


@router.get("/api/admin/user/loadUsersAccounts")
async def load_users_accounts():
    users = [
        {"login": "user1_login"},
        {"login": "user2_login"}
    ]
    return {"users": users}


@router.delete("/api/admin/user/deleteAccount")
async def admin_delete_account(login: str):
    return {"success": True}


@router.post("/api/admin/user/upgradeAccount")
async def upgrade_account(login: str):
    return {"success": True}



@router.get("/admin_test")
async def load_start_page():
    return FileResponse(path="static/admin/api_test.html")
