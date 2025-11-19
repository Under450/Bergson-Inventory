from fastapi import FastAPI, APIRouter, UploadFile, File, HTTPException, Form
from fastapi.responses import FileResponse, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import base64
import shutil

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create upload directories
UPLOADS_DIR = ROOT_DIR / 'uploads'
PHOTOS_DIR = UPLOADS_DIR / 'photos'
DOCUMENTS_DIR = UPLOADS_DIR / 'documents'
PROPERTY_PHOTOS_DIR = UPLOADS_DIR / 'property_photos'

for directory in [UPLOADS_DIR, PHOTOS_DIR, DOCUMENTS_DIR, PROPERTY_PHOTOS_DIR]:
    directory.mkdir(parents=True, exist_ok=True)

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Pydantic Models
class PropertyOverview(BaseModel):
    address: str
    property_type: str = "Residential"
    landlord_name: str
    tenant_names: List[str]
    inspection_date: str
    general_description: str = ""
    property_photos: List[str] = []  # File paths

class MeterInfo(BaseModel):
    meter_type: str  # Electric, Gas, Water
    serial_number: str
    location: str
    photo: Optional[str] = None  # File path

class SafetyItem(BaseModel):
    item_type: str  # smoke_alarm, co_detector, fire_extinguisher, fuse_box, stopcock, gas_valve
    location: str
    count: int = 1
    photo: Optional[str] = None

class AlarmComplianceChecks(BaseModel):
    smoke_alarms_all_floors: Optional[bool] = None
    smoke_alarms_test_buttons: Optional[bool] = None
    smoke_alarms_missing_areas: Optional[bool] = None
    co_alarms_present: Optional[bool] = None
    co_alarms_test_buttons: Optional[bool] = None
    co_alarms_missing_areas: Optional[bool] = None

class HealthSafety(BaseModel):
    meters: List[MeterInfo] = []
    safety_items: List[SafetyItem] = []
    compliance_documents: List[str] = []  # File paths to uploaded docs
    alarm_compliance_checks: Optional[AlarmComplianceChecks] = None

class ItemCondition(BaseModel):
    item_name: str  # e.g., "Walls", "Carpet", "Window"
    condition: str  # Excellent, Good, Fair, Poor, Damaged
    description: str = ""
    photos: List[str] = []  # File paths with metadata

class Room(BaseModel):
    room_name: str
    general_notes: str = ""
    items: List[ItemCondition] = []

class PhotoMetadata(BaseModel):
    file_path: str
    room_reference: str
    timestamp: str
    description: str = ""

class SignatureEntry(BaseModel):
    signer_name: str
    signer_role: str  # "Inspector" or "Tenant"
    signature_data: str  # Base64 encoded signature
    signed_at: str
    ip_address: str = ""
    email: str = ""

class Signature(BaseModel):
    signatures: List[SignatureEntry] = []
    tenant_present_during_inspection: Optional[bool] = None
    is_locked: bool = False

class Inventory(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    property_overview: PropertyOverview
    health_safety: HealthSafety
    rooms: List[Room] = []
    photo_vault: List[PhotoMetadata] = []
    status: str = "draft"  # draft, sent, signed, archived
    shareable_link: Optional[str] = None
    signature: Optional[Signature] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class InventoryCreate(BaseModel):
    property_overview: PropertyOverview
    health_safety: HealthSafety = HealthSafety()
    rooms: List[Room] = []

class InventoryUpdate(BaseModel):
    property_overview: Optional[PropertyOverview] = None
    health_safety: Optional[HealthSafety] = None
    rooms: Optional[List[Room]] = None
    status: Optional[str] = None

class SignatureSubmit(BaseModel):
    signer_name: str
    signer_role: str  # "Inspector" or "Tenant"
    signature_data: str
    ip_address: str = ""
    email: str = ""
    tenant_present: Optional[bool] = None

# API Routes
@api_router.get("/")
async def root():
    return {"message": "Bergason Property Services - Inventory API"}

# Inventory CRUD
@api_router.post("/inventories", response_model=Inventory)
async def create_inventory(inventory_data: InventoryCreate):
    inventory = Inventory(**inventory_data.model_dump())
    doc = inventory.model_dump()
    await db.inventories.insert_one(doc)
    return inventory

@api_router.get("/inventories", response_model=List[Inventory])
async def get_inventories():
    inventories = await db.inventories.find({}, {"_id": 0}).to_list(1000)
    return inventories

@api_router.get("/inventories/{inventory_id}", response_model=Inventory)
async def get_inventory(inventory_id: str):
    inventory = await db.inventories.find_one({"id": inventory_id}, {"_id": 0})
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    return inventory

@api_router.put("/inventories/{inventory_id}", response_model=Inventory)
async def update_inventory(inventory_id: str, update_data: InventoryUpdate):
    inventory = await db.inventories.find_one({"id": inventory_id}, {"_id": 0})
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    # Check if locked (signed)
    if inventory.get("signature") and inventory["signature"].get("is_locked"):
        raise HTTPException(status_code=403, detail="Cannot modify signed inventory")
    
    update_dict = {k: v for k, v in update_data.model_dump().items() if v is not None}
    update_dict["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.inventories.update_one(
        {"id": inventory_id},
        {"$set": update_dict}
    )
    
    updated_inventory = await db.inventories.find_one({"id": inventory_id}, {"_id": 0})
    return updated_inventory

@api_router.delete("/inventories/{inventory_id}")
async def delete_inventory(inventory_id: str):
    result = await db.inventories.delete_one({"id": inventory_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Inventory not found")
    return {"message": "Inventory deleted successfully"}

# File Upload
@api_router.post("/upload/photo")
async def upload_photo(file: UploadFile = File(...), room_reference: str = Form(...), description: str = Form("")):
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = PHOTOS_DIR / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    photo_metadata = {
        "file_path": f"/uploads/photos/{unique_filename}",
        "room_reference": room_reference,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "description": description,
        "original_filename": file.filename
    }
    
    return photo_metadata

@api_router.post("/upload/document")
async def upload_document(file: UploadFile = File(...)):
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = DOCUMENTS_DIR / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "file_path": f"/uploads/documents/{unique_filename}",
        "original_filename": file.filename,
        "uploaded_at": datetime.now(timezone.utc).isoformat()
    }

@api_router.post("/upload/property-photo")
async def upload_property_photo(file: UploadFile = File(...)):
    file_extension = file.filename.split(".")[-1]
    unique_filename = f"{uuid.uuid4()}.{file_extension}"
    file_path = PROPERTY_PHOTOS_DIR / unique_filename
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    return {
        "file_path": f"/uploads/property_photos/{unique_filename}",
        "original_filename": file.filename
    }

# Serve uploaded files
@api_router.get("/uploads/{file_type}/{filename}")
async def get_uploaded_file(file_type: str, filename: str):
    file_path = UPLOADS_DIR / file_type / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    return FileResponse(file_path)

# Generate Shareable Link
@api_router.post("/inventories/{inventory_id}/generate-link")
async def generate_shareable_link(inventory_id: str):
    inventory = await db.inventories.find_one({"id": inventory_id}, {"_id": 0})
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory not found")
    
    shareable_token = str(uuid.uuid4())
    shareable_link = f"/sign/{shareable_token}"
    
    await db.inventories.update_one(
        {"id": inventory_id},
        {"$set": {"shareable_link": shareable_token, "status": "sent"}}
    )
    
    return {"shareable_link": shareable_link, "token": shareable_token}

# Get Inventory by Shareable Link
@api_router.get("/sign/{token}", response_model=Inventory)
async def get_inventory_by_token(token: str):
    inventory = await db.inventories.find_one({"shareable_link": token}, {"_id": 0})
    if not inventory:
        raise HTTPException(status_code=404, detail="Invalid or expired link")
    return inventory

# Submit Signature
@api_router.post("/sign/{token}/submit")
async def submit_signature(token: str, signature_data: SignatureSubmit):
    inventory = await db.inventories.find_one({"shareable_link": token}, {"_id": 0})
    if not inventory:
        raise HTTPException(status_code=404, detail="Invalid link")
    
    # Get existing signature or create new one
    existing_signature = inventory.get("signature", {})
    if existing_signature.get("is_locked"):
        raise HTTPException(status_code=403, detail="Document already locked")
    
    # Create new signature entry
    new_entry = SignatureEntry(
        signer_name=signature_data.signer_name,
        signer_role=signature_data.signer_role,
        signature_data=signature_data.signature_data,
        signed_at=datetime.now(timezone.utc).isoformat(),
        ip_address=signature_data.ip_address,
        email=signature_data.email
    )
    
    # Add to signatures list
    signatures_list = existing_signature.get("signatures", [])
    signatures_list.append(new_entry.model_dump())
    
    # Update signature object
    signature = {
        "signatures": signatures_list,
        "tenant_present_during_inspection": signature_data.tenant_present if signature_data.tenant_present is not None else existing_signature.get("tenant_present_during_inspection"),
        "is_locked": False  # Will be locked when all required signatures are collected
    }
    
    await db.inventories.update_one(
        {"shareable_link": token},
        {"$set": {"signature": signature, "status": "signed"}}
    )
    
    return {"message": "Signature submitted successfully", "verification_link": f"/verify/{token}"}

# Verify Signature
@api_router.get("/verify/{token}")
async def verify_signature(token: str):
    inventory = await db.inventories.find_one({"shareable_link": token}, {"_id": 0})
    if not inventory:
        raise HTTPException(status_code=404, detail="Invalid verification link")
    
    if not inventory.get("signature"):
        raise HTTPException(status_code=404, detail="Document not signed")
    
    return {
        "inventory_id": inventory["id"],
        "property_address": inventory["property_overview"]["address"],
        "signature": inventory["signature"],
        "status": "verified",
        "is_authentic": True
    }

# Get predefined rooms list
@api_router.get("/rooms/predefined")
async def get_predefined_rooms():
    rooms = [
        "Front Garden", "Porch", "Meter Cupboard", "Hallway", "WC",
        "Living Room", "Dining Room", "Kitchen", "Stairs", "Landing",
        "Airing Cupboard", "Bedroom 1", "Bedroom 2", "Bedroom 3", "Bedroom 4",
        "Bedroom 5", "Ensuite", "Bathroom", "Misc First Floor", "Rear Garden",
        "Outbuilding", "Garage", "Loft"
    ]
    return {"rooms": rooms}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()