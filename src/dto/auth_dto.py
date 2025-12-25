from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    login: str
    password: str


class LoginResponse(BaseModel):
    access_token: int


class RegisterRequest(BaseModel):
    login: str
    password: str


class LogoutRequest(BaseModel):
    user_id: int
