import asyncio
import sys
sys.path.append('/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import os
from dotenv import load_dotenv
from datetime import datetime, timedelta
import uuid

load_dotenv('/app/backend/.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def seed_database():
    print("🌱 Starting database seeding...")
    
    # Clear existing data
    await db.users.delete_many({})
    await db.societies.delete_many({})
    await db.units.delete_many({})
    await db.visitors.delete_many({})
    await db.bills.delete_many({})
    await db.complaints.delete_many({})
    await db.notices.delete_many({})
    await db.vendors.delete_many({})
    await db.expenses.delete_many({})
    print("✅ Cleared existing data")
    
    # Create Society
    society_id = str(uuid.uuid4())
    admin_id = str(uuid.uuid4())
    
    society = {
        "id": society_id,
        "name": "Green Valley Apartments",
        "address": "123 Main Street, Mumbai, Maharashtra 400001",
        "total_units": 20,
        "admin_id": admin_id,
        "created_at": datetime.utcnow()
    }
    await db.societies.insert_one(society)
    print("✅ Created society: Green Valley Apartments")
    
    # Create Units
    units = []
    for i in range(1, 21):
        building = "A" if i <= 10 else "B"
        unit_number = str(i if i <= 10 else i - 10)
        unit_id = str(uuid.uuid4())
        
        unit = {
            "id": unit_id,
            "unit_number": unit_number,
            "building": building,
            "society_id": society_id,
            "owner_id": None,
            "tenant_id": None,
            "parking_slots": [f"{building}-P{unit_number}"],
            "created_at": datetime.utcnow()
        }
        units.append(unit)
    
    await db.units.insert_many(units)
    print(f"✅ Created {len(units)} units")
    
    # Create Admin User
    admin_user = {
        "id": admin_id,
        "email": "admin@greenvalley.com",
        "password": pwd_context.hash("admin123"),
        "name": "John Admin",
        "phone": "+91 98765 43210",
        "role": "admin",
        "society_id": society_id,
        "unit_id": None,
        "profile_pic": None,
        "emergency_contact": "+91 98765 43211",
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(admin_user)
    print("✅ Created admin user: admin@greenvalley.com / admin123")
    
    # Create Gatekeeper User
    gatekeeper_id = str(uuid.uuid4())
    gatekeeper_user = {
        "id": gatekeeper_id,
        "email": "gatekeeper@greenvalley.com",
        "password": pwd_context.hash("gate123"),
        "name": "Ramesh Kumar",
        "phone": "+91 98765 43220",
        "role": "gatekeeper",
        "society_id": society_id,
        "unit_id": None,
        "profile_pic": None,
        "emergency_contact": None,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(gatekeeper_user)
    print("✅ Created gatekeeper user: gatekeeper@greenvalley.com / gate123")
    
    # Create Resident Users
    resident_users = []
    for i in range(5):
        resident_id = str(uuid.uuid4())
        unit = units[i]
        
        # Update unit with owner
        await db.units.update_one(
            {"id": unit["id"]},
            {"$set": {"owner_id": resident_id}}
        )
        
        resident = {
            "id": resident_id,
            "email": f"resident{i+1}@greenvalley.com",
            "password": pwd_context.hash("resident123"),
            "name": ["Priya Sharma", "Rahul Verma", "Anjali Patel", "Vikram Singh", "Sneha Reddy"][i],
            "phone": f"+91 98765 4323{i}",
            "role": "resident",
            "society_id": society_id,
            "unit_id": unit["id"],
            "profile_pic": None,
            "emergency_contact": f"+91 98765 5555{i}",
            "created_at": datetime.utcnow()
        }
        resident_users.append(resident)
    
    await db.users.insert_many(resident_users)
    print(f"✅ Created {len(resident_users)} resident users")
    
    # Create Visitors
    visitors = []
    for i in range(3):
        visitor = {
            "id": str(uuid.uuid4()),
            "name": ["Amit Kumar", "Neha Gupta", "Ravi Sharma"][i],
            "phone": f"+91 99999 9999{i}",
            "purpose": ["Personal Visit", "Delivery", "Maintenance"][i],
            "unit_id": units[i]["id"],
            "resident_id": resident_users[i]["id"],
            "entry_time": datetime.utcnow() - timedelta(hours=i),
            "exit_time": None if i == 0 else datetime.utcnow() - timedelta(minutes=30),
            "photo": None,
            "status": "inside" if i == 0 else "exited",
            "vehicle_number": f"MH01AB123{i}" if i < 2 else None,
            "created_at": datetime.utcnow() - timedelta(hours=i)
        }
        visitors.append(visitor)
    
    await db.visitors.insert_many(visitors)
    print(f"✅ Created {len(visitors)} visitor records")
    
    # Create Bills
    bills = []
    for i, resident in enumerate(resident_users):
        # Current month unpaid bill
        bill = {
            "id": str(uuid.uuid4()),
            "unit_id": resident["unit_id"],
            "month": datetime.utcnow().month,
            "year": datetime.utcnow().year,
            "maintenance": 5000.0,
            "parking": 500.0,
            "other_charges": 200.0,
            "penalty": 0.0,
            "total": 5700.0,
            "paid": False,
            "payment_id": None,
            "due_date": datetime(datetime.utcnow().year, datetime.utcnow().month, 10),
            "created_at": datetime.utcnow()
        }
        bills.append(bill)
        
        # Previous month paid bill
        prev_month = datetime.utcnow().month - 1 if datetime.utcnow().month > 1 else 12
        prev_year = datetime.utcnow().year if datetime.utcnow().month > 1 else datetime.utcnow().year - 1
        
        paid_bill = {
            "id": str(uuid.uuid4()),
            "unit_id": resident["unit_id"],
            "month": prev_month,
            "year": prev_year,
            "maintenance": 5000.0,
            "parking": 500.0,
            "other_charges": 150.0,
            "penalty": 0.0,
            "total": 5650.0,
            "paid": True,
            "payment_id": f"PAY{uuid.uuid4().hex[:8].upper()}",
            "due_date": datetime(prev_year, prev_month, 10),
            "created_at": datetime.utcnow() - timedelta(days=30)
        }
        bills.append(paid_bill)
    
    await db.bills.insert_many(bills)
    print(f"✅ Created {len(bills)} bill records")
    
    # Create Notices
    notices = [
        {
            "id": str(uuid.uuid4()),
            "title": "Annual General Meeting",
            "content": "The Annual General Meeting will be held on 15th January 2025 at 6:00 PM in the community hall. All residents are requested to attend.",
            "society_id": society_id,
            "created_by": admin_id,
            "priority": "urgent",
            "created_at": datetime.utcnow() - timedelta(days=2)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Water Supply Maintenance",
            "content": "Water supply will be temporarily suspended on Sunday from 10 AM to 2 PM for maintenance work.",
            "society_id": society_id,
            "created_by": admin_id,
            "priority": "normal",
            "created_at": datetime.utcnow() - timedelta(days=5)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "New Parking Rules",
            "content": "Please ensure vehicles are parked only in designated parking slots. Unauthorized parking will be subject to penalties.",
            "society_id": society_id,
            "created_by": admin_id,
            "priority": "normal",
            "created_at": datetime.utcnow() - timedelta(days=10)
        }
    ]
    await db.notices.insert_many(notices)
    print(f"✅ Created {len(notices)} notices")
    
    # Create Complaints
    complaints = [
        {
            "id": str(uuid.uuid4()),
            "title": "Elevator not working",
            "description": "The elevator in Building A has been out of order for the past 2 days. Please fix it urgently.",
            "unit_id": resident_users[0]["unit_id"],
            "user_id": resident_users[0]["id"],
            "photos": [],
            "status": "open",
            "assigned_to": None,
            "priority": "high",
            "created_at": datetime.utcnow() - timedelta(days=1),
            "updated_at": datetime.utcnow() - timedelta(days=1)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Water leakage in bathroom",
            "description": "There is water leakage from the ceiling in the bathroom. Needs immediate attention.",
            "unit_id": resident_users[1]["unit_id"],
            "user_id": resident_users[1]["id"],
            "photos": [],
            "status": "in_progress",
            "assigned_to": None,
            "priority": "medium",
            "created_at": datetime.utcnow() - timedelta(days=3),
            "updated_at": datetime.utcnow() - timedelta(days=2)
        },
        {
            "id": str(uuid.uuid4()),
            "title": "Streetlight not working",
            "description": "The streetlight near parking area is not working. Please replace the bulb.",
            "unit_id": resident_users[2]["unit_id"],
            "user_id": resident_users[2]["id"],
            "photos": [],
            "status": "resolved",
            "assigned_to": None,
            "priority": "low",
            "created_at": datetime.utcnow() - timedelta(days=7),
            "updated_at": datetime.utcnow() - timedelta(days=5)
        }
    ]
    await db.complaints.insert_many(complaints)
    print(f"✅ Created {len(complaints)} complaints")
    
    # Create Vendors
    vendors = [
        {
            "id": str(uuid.uuid4()),
            "name": "ABC Security Services",
            "service_type": "Security",
            "phone": "+91 99999 11111",
            "email": "contact@abcsecurity.com",
            "society_id": society_id,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Quick Fix Plumbers",
            "service_type": "Plumbing",
            "phone": "+91 99999 22222",
            "email": "service@quickfix.com",
            "society_id": society_id,
            "created_at": datetime.utcnow()
        },
        {
            "id": str(uuid.uuid4()),
            "name": "Green Clean Services",
            "service_type": "Housekeeping",
            "phone": "+91 99999 33333",
            "email": "info@greenclean.com",
            "society_id": society_id,
            "created_at": datetime.utcnow()
        }
    ]
    await db.vendors.insert_many(vendors)
    print(f"✅ Created {len(vendors)} vendors")
    
    # Create Expenses
    expenses = [
        {
            "id": str(uuid.uuid4()),
            "vendor_id": vendors[0]["id"],
            "amount": 25000.0,
            "category": "Security",
            "description": "Monthly security services payment",
            "society_id": society_id,
            "invoice": None,
            "date": datetime.utcnow() - timedelta(days=5),
            "created_at": datetime.utcnow() - timedelta(days=5)
        },
        {
            "id": str(uuid.uuid4()),
            "vendor_id": vendors[2]["id"],
            "amount": 15000.0,
            "category": "Housekeeping",
            "description": "Monthly housekeeping services",
            "society_id": society_id,
            "invoice": None,
            "date": datetime.utcnow() - timedelta(days=3),
            "created_at": datetime.utcnow() - timedelta(days=3)
        }
    ]
    await db.expenses.insert_many(expenses)
    print(f"✅ Created {len(expenses)} expense records")
    
    print("\n🎉 Database seeding completed successfully!\n")
    print("=" * 60)
    print("TEST CREDENTIALS:")
    print("=" * 60)
    print("Admin User:")
    print("  Email: admin@greenvalley.com")
    print("  Password: admin123")
    print("\nGatekeeper User:")
    print("  Email: gatekeeper@greenvalley.com")
    print("  Password: gate123")
    print("\nResident Users:")
    for i in range(5):
        print(f"  Email: resident{i+1}@greenvalley.com")
        print(f"  Password: resident123")
    print("=" * 60)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())
