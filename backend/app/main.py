from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.auth import router as auth_router
from app.api.sayings import router as sayings_router
from app.api.events import router as events_router
from app.api.articles import router as articles_router
from app.api.upload import router as upload_router
from app.api.dictionary import router as dictionary_router
from app.api.library import router as library_router

# Swagger UI et ReDoc sont exposés uniquement en développement local.
# En production (ENVIRONMENT=production), les routes /docs et /redoc sont désactivées.
_is_dev = settings.ENVIRONMENT != "production"

app = FastAPI(
    title="Provencal.ia API",
    description=(
        "API du portail culturel provençal.\n\n"
        "**Authentification :** JWT Bearer token — utiliser `POST /auth/login` "
        "pour obtenir un token, puis cliquer sur **Authorize** (🔒) en haut à droite.\n\n"
        "**Environnement actuel :** `" + settings.ENVIRONMENT + "`"
    ),
    version="0.1.0",
    contact={"name": "Équipe Provencal.ia"},
    docs_url="/docs" if _is_dev else None,
    redoc_url="/redoc" if _is_dev else None,
    openapi_url="/openapi.json" if _is_dev else None,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", tags=["Système"], summary="Santé de l'API")
def health_check():
    return {"status": "ok", "environment": settings.ENVIRONMENT}


app.include_router(auth_router, prefix="/api/v1")
app.include_router(sayings_router, prefix="/api/v1")
app.include_router(events_router, prefix="/api/v1")
app.include_router(articles_router, prefix="/api/v1")
app.include_router(upload_router, prefix="/api/v1")
app.include_router(dictionary_router, prefix="/api/v1")
app.include_router(library_router, prefix="/api/v1")

app.mount("/static", StaticFiles(directory="static"), name="static")
