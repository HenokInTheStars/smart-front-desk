import os
import uuid
import shutil
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_db
from app.db.models import SystemSettings
from pydantic import BaseModel

router = APIRouter(prefix="/settings", tags=["settings"])

class SettingUpdate(BaseModel):
    value: Any

@router.get("/{key}")
async def get_setting(key: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSettings).where(SystemSettings.key == key))
    setting = result.scalars().first()
    if setting:
        return {"data": setting.value}
    # Return default empty if not found
    return {"data": None}

@router.post("/{key}")
async def update_setting(key: str, payload: SettingUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SystemSettings).where(SystemSettings.key == key))
    setting = result.scalars().first()
    
    if setting:
        setting.value = payload.value
    else:
        setting = SystemSettings(key=key, value=payload.value)
        db.add(setting)
        
    await db.commit()
    return {"status": "success"}

@router.post("/upload/image")
async def upload_image(file: UploadFile = File(...)):
    # Create an uploads directory if it doesn't exist
    upload_dir = os.path.join(os.getcwd(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    
    # Generate unique filename
    ext = os.path.splitext(file.filename)[1] if file.filename else ""
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(upload_dir, filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    # Return the URL that will be accessible via StaticFiles
    # For Next.js to use, we'll return an absolute URL using the backend origin
    return {"url": f"{os.getenv('API_BASE_URL', 'http://localhost:8000')}/uploads/{filename}"}
