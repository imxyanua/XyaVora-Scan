from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_analyze_valid_domain():
    r = client.post("/api/analyze", json={"target": "github.com"})
    assert r.status_code == 200
    body = r.json()
    assert body["success"] is True
    data = body["data"]
    assert data["hostname"] == "github.com"
    assert data["normalizedUrl"] == "https://github.com"
    assert "score" in data
    assert "findings" in data


def test_analyze_strips_https():
    r = client.post("/api/analyze", json={"target": "https://github.com/path"})
    assert r.status_code == 200
    assert r.json()["data"]["hostname"] == "github.com"


def test_analyze_private_ip_blocked():
    r = client.post("/api/analyze", json={"target": "192.168.1.1"})
    assert r.status_code == 400
    body = r.json()
    assert body["success"] is False
    assert body["error"] is not None


def test_analyze_metadata_blocked():
    r = client.post("/api/analyze", json={"target": "169.254.169.254"})
    assert r.status_code == 400
    assert r.json()["success"] is False


def test_analyze_localhost_blocked():
    r = client.post("/api/analyze", json={"target": "localhost"})
    assert r.status_code == 400
    assert r.json()["success"] is False


def test_analyze_empty_target():
    r = client.post("/api/analyze", json={"target": ""})
    # Pydantic validator raises → FastAPI returns 422
    assert r.status_code in (400, 422)


def test_analyze_missing_body():
    r = client.post("/api/analyze", json={})
    assert r.status_code == 422
