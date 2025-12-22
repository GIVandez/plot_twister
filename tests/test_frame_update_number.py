from fastapi.testclient import TestClient
from src.core.init_api import app
import src.routes.frame_router as frame_router

client = TestClient(app)


def test_update_frame_number_endpoint(monkeypatch):
    # Monkeypatch frame_model.update_frame_number to avoid DB dependency
    monkeypatch.setattr(frame_router.frame_model, 'update_frame_number', lambda frame_id, number: True)

    response = client.post('/api/frame/updateNumber', json={'frame_id': 1, 'frame_number': 2})
    assert response.status_code == 200
    assert response.json() == {'success': True}


def test_update_frame_number_not_found(monkeypatch):
    # Simulate frame not found
    def fake_get_frame_info(frame_id):
        return None
    monkeypatch.setattr(frame_router.frame_model, 'get_frame_info', fake_get_frame_info)

    response = client.post('/api/frame/updateNumber', json={'frame_id': 9999, 'frame_number': 1})
    assert response.status_code == 404
