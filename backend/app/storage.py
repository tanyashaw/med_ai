from pathlib import Path

from fastapi import UploadFile

from app.config import settings


def save_upload(organization_id: str, case_id: str, file: UploadFile, data: bytes) -> str:
    root = Path(settings.upload_dir)
    dest_dir = root / organization_id / case_id
    dest_dir.mkdir(parents=True, exist_ok=True)
    safe_name = Path(file.filename or "document").name.replace("..", "_")
    dest = dest_dir / safe_name
    if dest.exists():
        dest = dest_dir / f"{dest.stem}_{len(list(dest_dir.iterdir()))}{dest.suffix}"
    dest.write_bytes(data)
    return str(dest)
