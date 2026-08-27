from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_healthz():
    response = client.get("/healthz")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_openapi_schema_includes_sprint2_contract():
    schema = client.get("/openapi.json").json()
    paths = schema["paths"]
    for expected in ["/auth/login", "/employees", "/visitors", "/appointments"]:
        assert expected in paths
