import os
import uuid
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from pymongo import MongoClient
from passlib.context import CryptContext
import jwt
from contextlib import asynccontextmanager

# Configuration
MONGO_URL = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('DB_NAME', 'streamflix_db')
SECRET_KEY = "streamflix_secret_key_very_secure"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# MongoDB setup
client = MongoClient(MONGO_URL)
db = client[DB_NAME]

# Collections
users_collection = db.users
contents_collection = db.contents
favorites_collection = db.favorites
watch_progress_collection = db.watch_progress

# Models
class User(BaseModel):
    id: str
    email: EmailStr
    password: str
    role: str = "user"
    created_at: datetime

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    role: str
    created_at: datetime

class Content(BaseModel):
    id: str
    title: str
    description: str
    category: str
    video_url: str
    video_source: str  # "vimeo", "dailymotion", "google_drive"
    cover_image: str
    type: str  # "movie", "series"
    duration: Optional[int] = None
    year: Optional[int] = None
    created_at: datetime
    updated_at: datetime

class ContentCreate(BaseModel):
    title: str
    description: str
    category: str
    video_url: str
    video_source: str
    cover_image: str
    type: str = "movie"
    duration: Optional[int] = None
    year: Optional[int] = None

class ContentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    video_url: Optional[str] = None
    video_source: Optional[str] = None
    cover_image: Optional[str] = None
    type: Optional[str] = None
    duration: Optional[int] = None
    year: Optional[int] = None

class Favorite(BaseModel):
    id: str
    user_id: str
    content_id: str
    created_at: datetime

class WatchProgress(BaseModel):
    id: str
    user_id: str
    content_id: str
    watched_time: int  # in seconds
    total_duration: int  # in seconds
    last_watched: datetime

# Utility functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return email
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(email: str = Depends(verify_token)):
    user = users_collection.find_one({"email": email})
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    return user

def get_admin_user(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough permissions"
        )
    return current_user

async def init_admin_user():
    """Initialize admin user if it doesn't exist"""
    admin_email = "alexx5916000@gmail.com"
    admin_password = "@lexiS-59_160"
    
    existing_admin = users_collection.find_one({"email": admin_email})
    if not existing_admin:
        admin_user = {
            "id": str(uuid.uuid4()),
            "email": admin_email,
            "password": get_password_hash(admin_password),
            "role": "admin",
            "created_at": datetime.utcnow()
        }
        users_collection.insert_one(admin_user)
        print(f"Admin user created: {admin_email}")
    else:
        print("Admin user already exists")

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize admin user on startup
    await init_admin_user()
    yield

# FastAPI app
app = FastAPI(title="Streamflix API", lifespan=lifespan)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "message": "Streamflix API is running"}

@app.post("/api/auth/login")
async def login(user_data: UserLogin):
    user = users_collection.find_one({"email": user_data.email})
    if not user or not verify_password(user_data.password, user["password"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@app.post("/api/auth/register")
async def register(user_data: UserLogin):
    existing_user = users_collection.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = {
        "id": str(uuid.uuid4()),
        "email": user_data.email,
        "password": get_password_hash(user_data.password),
        "role": "user",
        "created_at": datetime.utcnow()
    }
    
    users_collection.insert_one(user)
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user["email"]}, expires_delta=access_token_expires
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "id": user["id"],
            "email": user["email"],
            "role": user["role"]
        }
    }

@app.get("/api/auth/me")
async def get_current_user_info(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user["id"],
        "email": current_user["email"],
        "role": current_user["role"]
    }

# Admin routes
@app.get("/api/admin/contents")
async def get_all_contents(admin_user: dict = Depends(get_admin_user)):
    contents = list(contents_collection.find({}))
    # Convert MongoDB ObjectId to string to make it JSON serializable
    for content in contents:
        if '_id' in content:
            content['_id'] = str(content['_id'])
    return contents

@app.post("/api/admin/contents")
async def create_content(content: ContentCreate, admin_user: dict = Depends(get_admin_user)):
    content_data = {
        "id": str(uuid.uuid4()),
        "title": content.title,
        "description": content.description,
        "category": content.category,
        "video_url": content.video_url,
        "video_source": content.video_source,
        "cover_image": content.cover_image,
        "type": content.type,
        "duration": content.duration,
        "year": content.year,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    
    contents_collection.insert_one(content_data)
    return content_data

@app.put("/api/admin/contents/{content_id}")
async def update_content(content_id: str, content: ContentUpdate, admin_user: dict = Depends(get_admin_user)):
    update_data = {k: v for k, v in content.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow()
    
    result = contents_collection.update_one(
        {"id": content_id},
        {"$set": update_data}
    )
    
    if result.matched_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    updated_content = contents_collection.find_one({"id": content_id})
    return updated_content

@app.delete("/api/admin/contents/{content_id}")
async def delete_content(content_id: str, admin_user: dict = Depends(get_admin_user)):
    result = contents_collection.delete_one({"id": content_id})
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    return {"message": "Content deleted successfully"}

# Public routes
@app.get("/api/contents")
async def get_contents(category: Optional[str] = None, search: Optional[str] = None):
    filter_query = {}
    
    if category:
        filter_query["category"] = category
    
    if search:
        filter_query["title"] = {"$regex": search, "$options": "i"}
    
    contents = list(contents_collection.find(filter_query))
    return contents

@app.get("/api/contents/{content_id}")
async def get_content(content_id: str):
    content = contents_collection.find_one({"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    return content

@app.get("/api/categories")
async def get_categories():
    categories = contents_collection.distinct("category")
    return categories

# User favorites
@app.get("/api/favorites")
async def get_user_favorites(current_user: dict = Depends(get_current_user)):
    favorites = list(favorites_collection.find({"user_id": current_user["id"]}))
    
    # Get content details for each favorite
    favorite_contents = []
    for favorite in favorites:
        content = contents_collection.find_one({"id": favorite["content_id"]})
        if content:
            favorite_contents.append({
                "favorite_id": favorite["id"],
                "content": content,
                "created_at": favorite["created_at"]
            })
    
    return favorite_contents

@app.post("/api/favorites/{content_id}")
async def add_to_favorites(content_id: str, current_user: dict = Depends(get_current_user)):
    # Check if content exists
    content = contents_collection.find_one({"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    # Check if already in favorites
    existing_favorite = favorites_collection.find_one({
        "user_id": current_user["id"],
        "content_id": content_id
    })
    if existing_favorite:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Content already in favorites"
        )
    
    favorite = {
        "id": str(uuid.uuid4()),
        "user_id": current_user["id"],
        "content_id": content_id,
        "created_at": datetime.utcnow()
    }
    
    favorites_collection.insert_one(favorite)
    return {"message": "Added to favorites"}

@app.delete("/api/favorites/{content_id}")
async def remove_from_favorites(content_id: str, current_user: dict = Depends(get_current_user)):
    result = favorites_collection.delete_one({
        "user_id": current_user["id"],
        "content_id": content_id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Favorite not found"
        )
    
    return {"message": "Removed from favorites"}

# Watch progress
@app.get("/api/watch-progress/{content_id}")
async def get_watch_progress(content_id: str, current_user: dict = Depends(get_current_user)):
    progress = watch_progress_collection.find_one({
        "user_id": current_user["id"],
        "content_id": content_id
    })
    
    if not progress:
        return {"watched_time": 0, "total_duration": 0}
    
    return {
        "watched_time": progress["watched_time"],
        "total_duration": progress["total_duration"],
        "last_watched": progress["last_watched"]
    }

@app.post("/api/watch-progress/{content_id}")
async def update_watch_progress(
    content_id: str, 
    watched_time: int, 
    total_duration: int,
    current_user: dict = Depends(get_current_user)
):
    # Check if content exists
    content = contents_collection.find_one({"id": content_id})
    if not content:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Content not found"
        )
    
    progress_data = {
        "user_id": current_user["id"],
        "content_id": content_id,
        "watched_time": watched_time,
        "total_duration": total_duration,
        "last_watched": datetime.utcnow()
    }
    
    # Update or insert progress
    result = watch_progress_collection.update_one(
        {"user_id": current_user["id"], "content_id": content_id},
        {"$set": progress_data},
        upsert=True
    )
    
    return {"message": "Watch progress updated"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)