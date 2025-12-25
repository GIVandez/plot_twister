from fastapi.testclient import TestClient
from core.init_api import app
import routes.admin_router as admin_router

client = TestClient(app)


def test_admin_page_requires_auth():
    resp = client.get("/admin/admin.html")
    assert resp.status_code == 401


def test_admin_page_forbidden_for_non_admin(monkeypatch):
    # simulate DB returning role 'user'
    monkeypatch.setattr(admin_router.db_repo, 'read_user_info', lambda login: {'role': 'user'})
    resp = client.get("/admin/admin.html", cookies={"pt_login": "someuser"})
    assert resp.status_code == 403


def test_admin_page_allowed_for_admin(monkeypatch):
    # simulate DB returning role 'admin'
    monkeypatch.setattr(admin_router.db_repo, 'read_user_info', lambda login: {'role': 'admin'})
    resp = client.get("/admin/admin.html", cookies={"pt_login": "admin"})
    assert resp.status_code == 200
    # ensure content is HTML
    assert 'text/html' in resp.headers.get('content-type', '')


def test_static_admin_redirects():
    resp = client.get("/static/admin/admin.html")
    assert resp.status_code == 200
    text = resp.text
    # static file should be a redirect page, not the real admin content
    assert '/admin/admin.html' in text
    assert 'Пользователи' not in text


def test_api_admin_requires_auth():
    resp = client.get('/api/admin/user/loadUsersAccounts')
    assert resp.status_code == 401


def test_api_admin_forbidden_for_non_admin(monkeypatch):
    monkeypatch.setattr(admin_router.db_repo, 'read_user_info', lambda login: {'role': 'user'})
    resp = client.get('/api/admin/user/loadUsersAccounts', cookies={"pt_login": "user"})
    assert resp.status_code == 403


def test_user_info_endpoint_returns_role_admin(monkeypatch):
    import routes.user_router as user_router
    # simulate that user_model.get_user_info returns role 'admin'
    monkeypatch.setattr(user_router.user_model, 'get_user_info', lambda username: {'username': username, 'role': 'admin'})
    resp = client.get('/api/users/admin/info')
    assert resp.status_code == 200
    data = resp.json()
    assert data.get('role') == 'admin'
