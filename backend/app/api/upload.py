import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status

from app.api.deps import get_current_user
from app.models.user import User

router = APIRouter(prefix="/upload", tags=["Upload"])

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2 Mo

UPLOAD_DIR = Path(__file__).resolve().parent.parent.parent / "static" / "images"


@router.post("/image", summary="Upload d'image")
async def upload_image(
    file: UploadFile,
    current_user: User = Depends(get_current_user),
):
    # Vérifier le type MIME
    if file.content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Type de fichier non autorisé : {file.content_type}. "
                   f"Types acceptés : {', '.join(sorted(ALLOWED_MIME_TYPES))}",
        )

    # Vérifier l'extension
    original_name = file.filename or ""
    ext = Path(original_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Extension non autorisée : {ext}",
        )

    # Lire le contenu et vérifier la taille
    content = await file.read()
    if len(content) > MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Fichier trop volumineux ({len(content)} octets). Maximum : {MAX_SIZE_BYTES} octets (2 Mo)",
        )

    # Générer un nom unique
    unique_name = f"{uuid.uuid4().hex}{ext}"
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    file_path = UPLOAD_DIR / unique_name
    file_path.write_bytes(content)

    return {"image_ref": f"/static/images/{unique_name}"}
