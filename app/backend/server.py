from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import jwt
from passlib.context import CryptContext
from bson import ObjectId
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "housing-society-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ======================== MODELS ========================

class UserRole:
    ADMIN = "admin"
    RESIDENT = "resident"
    GATEKEEPER = "gatekeeper"
    VENDOR = "vendor"
    MANAGER = "manager"

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: str
    role: str
    society_id: Optional[str] = None
    unit_id: Optional[str] = None
    profile_pic: Optional[str] = None
    emergency_contact: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: str
    role: str = "resident"
    society_id: Optional[str] = None
    unit_id: Optional[str] = None
    emergency_contact: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class Society(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    total_units: int
    admin_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class SocietyCreate(BaseModel):
    name: str
    address: str
    total_units: int

class Unit(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    unit_number: str
    building: Optional[str] = None
    society_id: str
    owner_id: Optional[str] = None
    tenant_id: Optional[str] = None
    parking_slots: List[str] = []
    created_at: datetime = Field(default_factory=datetime.utcnow)

class UnitCreate(BaseModel):
    unit_number: str
    building: Optional[str] = None
    society_id: str
    owner_id: Optional[str] = None
    parking_slots: List[str] = []

class Visitor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    purpose: str
    unit_id: str
    resident_id: str
    entry_time: datetime = Field(default_factory=datetime.utcnow)
    exit_time: Optional[datetime] = None
    photo: Optional[str] = None
    status: str = "pending"  # pending, approved, inside, exited
    vehicle_number: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VisitorCreate(BaseModel):
    name: str
    phone: str
    purpose: str
    unit_id: str
    resident_id: str
    vehicle_number: Optional[str] = None
    photo: Optional[str] = None

class VisitorUpdate(BaseModel):
    status: Optional[str] = None
    exit_time: Optional[datetime] = None

class Bill(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    unit_id: str
    month: int
    year: int
    maintenance: float
    parking: float
    other_charges: float = 0.0
    penalty: float = 0.0
    total: float
    paid: bool = False
    payment_id: Optional[str] = None
    due_date: datetime
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BillCreate(BaseModel):
    unit_id: str
    month: int
    year: int
    maintenance: float
    parking: float
    other_charges: float = 0.0
    penalty: float = 0.0

class PaymentCreate(BaseModel):
    bill_id: str
    amount: float
    payment_method: str  # upi, card, netbanking
    transaction_id: Optional[str] = None

class Complaint(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    description: str
    unit_id: str
    user_id: str
    photos: List[str] = []
    status: str = "open"  # open, in_progress, resolved
    assigned_to: Optional[str] = None
    priority: str = "medium"  # low, medium, high
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class ComplaintCreate(BaseModel):
    title: str
    description: str
    unit_id: str
    photos: List[str] = []
    priority: str = "medium"

class ComplaintUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None

class Notice(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    content: str
    society_id: str
    created_by: str
    priority: str = "normal"  # normal, urgent
    created_at: datetime = Field(default_factory=datetime.utcnow)

class NoticeCreate(BaseModel):
    title: str
    content: str
    priority: str = "normal"

class Vendor(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    service_type: str
    phone: str
    email: Optional[EmailStr] = None
    society_id: str
    created_at: datetime = Field(default_factory=datetime.utcnow)

class VendorCreate(BaseModel):
    name: str
    service_type: str
    phone: str
    email: Optional[EmailStr] = None

class Expense(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    vendor_id: str
    amount: float
    category: str
    description: str
    society_id: str
    invoice: Optional[str] = None
    date: datetime = Field(default_factory=datetime.utcnow)
    created_at: datetime = Field(default_factory=datetime.utcnow)

class ExpenseCreate(BaseModel):
    vendor_id: str
    amount: float
    category: str
    description: str
    invoice: Optional[str] = None

# ======================== HELPER FUNCTIONS ========================

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid authentication credentials")
        
        user_data = await db.users.find_one({"id": user_id})
        if user_data is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user_data)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token has expired")
    except jwt.JWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")

# ======================== AUTH ROUTES ========================

@api_router.post("/auth/register")
async def register(user_create: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_create.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Hash password
    hashed_password = hash_password(user_create.password)
    
    # Create user
    user_dict = user_create.dict(exclude={"password"})
    user = User(**user_dict)
    user_data = user.dict()
    user_data["password"] = hashed_password
    
    await db.users.insert_one(user_data)
    
    # Create token
    access_token = create_access_token(data={"sub": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.dict()
    }

@api_router.post("/auth/login")
async def login(user_login: UserLogin):
    # Find user
    user_data = await db.users.find_one({"email": user_login.email})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Verify password
    if not verify_password(user_login.password, user_data["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    # Create token
    access_token = create_access_token(data={"sub": user_data["id"]})
    
    user = User(**user_data)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": user.dict()
    }

@api_router.get("/auth/me")
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# ======================== SOCIETY ROUTES ========================

@api_router.post("/societies", response_model=Society)
async def create_society(society_create: SocietyCreate, current_user: User = Depends(get_current_user)):
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(status_code=403, detail="Only admins can create societies")
    
    society = Society(**society_create.dict(), admin_id=current_user.id)
    await db.societies.insert_one(society.dict())
    return society

@api_router.get("/societies/{society_id}", response_model=Society)
async def get_society(society_id: str, current_user: User = Depends(get_current_user)):
    society_data = await db.societies.find_one({"id": society_id})
    if not society_data:
        raise HTTPException(status_code=404, detail="Society not found")
    return Society(**society_data)

# ======================== UNIT ROUTES ========================

@api_router.post("/units", response_model=Unit)
async def create_unit(unit_create: UnitCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins/managers can create units")
    
    unit = Unit(**unit_create.dict())
    await db.units.insert_one(unit.dict())
    return unit

@api_router.get("/units")
async def get_units(society_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if society_id:
        query["society_id"] = society_id
    elif current_user.society_id:
        query["society_id"] = current_user.society_id
    
    units = await db.units.find(query).to_list(1000)
    return [Unit(**unit) for unit in units]

@api_router.get("/units/{unit_id}", response_model=Unit)
async def get_unit(unit_id: str, current_user: User = Depends(get_current_user)):
    unit_data = await db.units.find_one({"id": unit_id})
    if not unit_data:
        raise HTTPException(status_code=404, detail="Unit not found")
    return Unit(**unit_data)

# ======================== VISITOR ROUTES ========================

@api_router.post("/visitors", response_model=Visitor)
async def create_visitor(visitor_create: VisitorCreate, current_user: User = Depends(get_current_user)):
    visitor = Visitor(**visitor_create.dict())
    await db.visitors.insert_one(visitor.dict())
    return visitor

@api_router.get("/visitors")
async def get_visitors(
    unit_id: Optional[str] = None,
    status: Optional[str] = None,
    date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if unit_id:
        query["unit_id"] = unit_id
    elif current_user.unit_id and current_user.role == UserRole.RESIDENT:
        query["unit_id"] = current_user.unit_id
    
    if status:
        query["status"] = status
    
    if date:
        start_date = datetime.fromisoformat(date.replace('Z', '+00:00'))
        end_date = start_date + timedelta(days=1)
        query["entry_time"] = {"$gte": start_date, "$lt": end_date}
    
    visitors = await db.visitors.find(query).sort("entry_time", -1).to_list(1000)
    return [Visitor(**visitor) for visitor in visitors]

@api_router.put("/visitors/{visitor_id}", response_model=Visitor)
async def update_visitor(visitor_id: str, visitor_update: VisitorUpdate, current_user: User = Depends(get_current_user)):
    visitor_data = await db.visitors.find_one({"id": visitor_id})
    if not visitor_data:
        raise HTTPException(status_code=404, detail="Visitor not found")
    
    update_data = visitor_update.dict(exclude_unset=True)
    if update_data:
        await db.visitors.update_one({"id": visitor_id}, {"$set": update_data})
        visitor_data.update(update_data)
    
    return Visitor(**visitor_data)

# ======================== BILL ROUTES ========================

@api_router.post("/bills", response_model=Bill)
async def create_bill(bill_create: BillCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins/managers can create bills")
    
    total = bill_create.maintenance + bill_create.parking + bill_create.other_charges + bill_create.penalty
    due_date = datetime(bill_create.year, bill_create.month, 10)
    
    bill = Bill(**bill_create.dict(), total=total, due_date=due_date)
    await db.bills.insert_one(bill.dict())
    return bill

@api_router.get("/bills")
async def get_bills(
    unit_id: Optional[str] = None,
    paid: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if unit_id:
        query["unit_id"] = unit_id
    elif current_user.unit_id and current_user.role == UserRole.RESIDENT:
        query["unit_id"] = current_user.unit_id
    
    if paid is not None:
        query["paid"] = paid
    
    bills = await db.bills.find(query).sort("created_at", -1).to_list(1000)
    return [Bill(**bill) for bill in bills]

@api_router.post("/bills/payment")
async def create_payment(payment: PaymentCreate, current_user: User = Depends(get_current_user)):
    bill_data = await db.bills.find_one({"id": payment.bill_id})
    if not bill_data:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    # Update bill as paid
    await db.bills.update_one(
        {"id": payment.bill_id},
        {"$set": {"paid": True, "payment_id": payment.transaction_id or str(uuid.uuid4())}}
    )
    
    return {"message": "Payment successful", "bill_id": payment.bill_id}

# ======================== COMPLAINT ROUTES ========================

@api_router.post("/complaints", response_model=Complaint)
async def create_complaint(complaint_create: ComplaintCreate, current_user: User = Depends(get_current_user)):
    complaint = Complaint(**complaint_create.dict(), user_id=current_user.id)
    await db.complaints.insert_one(complaint.dict())
    return complaint

@api_router.get("/complaints")
async def get_complaints(
    unit_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    query = {}
    
    if unit_id:
        query["unit_id"] = unit_id
    elif current_user.unit_id and current_user.role == UserRole.RESIDENT:
        query["unit_id"] = current_user.unit_id
    
    if status:
        query["status"] = status
    
    complaints = await db.complaints.find(query).sort("created_at", -1).to_list(1000)
    return [Complaint(**complaint) for complaint in complaints]

@api_router.put("/complaints/{complaint_id}", response_model=Complaint)
async def update_complaint(complaint_id: str, complaint_update: ComplaintUpdate, current_user: User = Depends(get_current_user)):
    complaint_data = await db.complaints.find_one({"id": complaint_id})
    if not complaint_data:
        raise HTTPException(status_code=404, detail="Complaint not found")
    
    update_data = complaint_update.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.utcnow()
    
    if update_data:
        await db.complaints.update_one({"id": complaint_id}, {"$set": update_data})
        complaint_data.update(update_data)
    
    return Complaint(**complaint_data)

# ======================== NOTICE ROUTES ========================

@api_router.post("/notices", response_model=Notice)
async def create_notice(notice_create: NoticeCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins/managers can create notices")
    
    if not current_user.society_id:
        raise HTTPException(status_code=400, detail="User must be associated with a society")
    
    notice = Notice(**notice_create.dict(), society_id=current_user.society_id, created_by=current_user.id)
    await db.notices.insert_one(notice.dict())
    return notice

@api_router.get("/notices")
async def get_notices(society_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if society_id:
        query["society_id"] = society_id
    elif current_user.society_id:
        query["society_id"] = current_user.society_id
    
    notices = await db.notices.find(query).sort("created_at", -1).to_list(100)
    return [Notice(**notice) for notice in notices]

# ======================== VENDOR ROUTES ========================

@api_router.post("/vendors", response_model=Vendor)
async def create_vendor(vendor_create: VendorCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins/managers can create vendors")
    
    if not current_user.society_id:
        raise HTTPException(status_code=400, detail="User must be associated with a society")
    
    vendor = Vendor(**vendor_create.dict(), society_id=current_user.society_id)
    await db.vendors.insert_one(vendor.dict())
    return vendor

@api_router.get("/vendors")
async def get_vendors(society_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if society_id:
        query["society_id"] = society_id
    elif current_user.society_id:
        query["society_id"] = current_user.society_id
    
    vendors = await db.vendors.find(query).to_list(1000)
    return [Vendor(**vendor) for vendor in vendors]

# ======================== EXPENSE ROUTES ========================

@api_router.post("/expenses", response_model=Expense)
async def create_expense(expense_create: ExpenseCreate, current_user: User = Depends(get_current_user)):
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(status_code=403, detail="Only admins/managers can create expenses")
    
    if not current_user.society_id:
        raise HTTPException(status_code=400, detail="User must be associated with a society")
    
    expense = Expense(**expense_create.dict(), society_id=current_user.society_id)
    await db.expenses.insert_one(expense.dict())
    return expense

@api_router.get("/expenses")
async def get_expenses(society_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    query = {}
    if society_id:
        query["society_id"] = society_id
    elif current_user.society_id:
        query["society_id"] = current_user.society_id
    
    expenses = await db.expenses.find(query).sort("date", -1).to_list(1000)
    return [Expense(**expense) for expense in expenses]

# ======================== DASHBOARD STATS ========================

@api_router.get("/dashboard/stats")
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    if not current_user.society_id:
        raise HTTPException(status_code=400, detail="User must be associated with a society")
    
    society_id = current_user.society_id
    
    # Get total units
    total_units = await db.units.count_documents({"society_id": society_id})
    
    # Get total residents
    total_residents = await db.users.count_documents({"society_id": society_id, "role": UserRole.RESIDENT})
    
    # Get pending bills
    pending_bills = await db.bills.count_documents({"paid": False})
    
    # Get today's visitors
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_visitors = await db.visitors.count_documents({
        "entry_time": {"$gte": today_start}
    })
    
    # Get open complaints
    open_complaints = await db.complaints.count_documents({"status": "open"})
    
    # Get total collection (paid bills)
    bills = await db.bills.find({"paid": True}).to_list(10000)
    total_collection = sum(bill["total"] for bill in bills)
    
    # Get total expenses
    expenses = await db.expenses.find({"society_id": society_id}).to_list(10000)
    total_expenses = sum(expense["amount"] for expense in expenses)
    
    return {
        "total_units": total_units,
        "total_residents": total_residents,
        "pending_bills": pending_bills,
        "today_visitors": today_visitors,
        "open_complaints": open_complaints,
        "total_collection": total_collection,
        "total_expenses": total_expenses,
        "balance": total_collection - total_expenses
    }

# ======================== MAIN APP ========================

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
