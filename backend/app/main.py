from fastapi import FastAPI

app = FastAPI(title="Smart Front Desk API")


@app.get("/healthz")
def healthz():
    return {"status": "ok"}


# Config loading (pydantic-settings), the async DB session/get_db dependency,
# and CORS middleware are Day 2-3 checklist items — this stub only needs to
# satisfy the Day 1 acceptance test: /docs loads and the container boots clean.
