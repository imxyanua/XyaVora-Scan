from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.routes.analyze        import router as analyze_router
from app.api.routes.history        import router as history_router
from app.api.routes.logs           import router as logs_router
from app.api.routes.settings_route import router as settings_router

app = FastAPI(title="XyaVora-Scan API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.CORS_ORIGIN],
    allow_methods=["POST", "GET", "PATCH"],
    allow_headers=["*"],
)

app.include_router(analyze_router,  prefix="/api")
app.include_router(history_router,  prefix="/api")
app.include_router(logs_router,     prefix="/api")
app.include_router(settings_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
