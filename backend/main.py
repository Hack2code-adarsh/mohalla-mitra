from fastapi import FastAPI, HTTPException, Header, UploadFile, File, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from pathlib import Path
import psycopg2
from psycopg2.extras import RealDictCursor
from psycopg2 import pool as pg_pool

# Connection pool for faster cloud DB access
_pg_pool = None

def get_pool():
    global _pg_pool
    if _pg_pool is None:
        _pg_pool = pg_pool.SimpleConnectionPool(1, 10, DATABASE_URL)
    return _pg_pool

def connect():
    conn = get_pool().getconn()
    return PgConnWrapper(conn)

# Override close to return connection to pool instead of closing
class PgConnWrapper:
    def __init__(self, conn):
        self._conn = conn

    def execute(self, query, params=()):
        cur = self._conn.cursor(cursor_factory=RealDictCursor)
        q = query.replace("?", "%s")
        cur.execute(q, params)
        self._last_cur = cur
        return PgCursorWrapper(cur)

    def executescript(self, script):
        cur = self._conn.cursor()
        cur.execute(script)
        cur.close()

    def commit(self):
        self._conn.commit()

    def close(self):
        self._conn.commit()
        get_pool().putconn(self._conn)

    def __enter__(self):
        return self

    def __exit__(self, *args):
        self._conn.commit()
        get_pool().putconn(self._conn)
from dotenv import load_dotenv
import secrets
import random
import hashlib
import os
import joblib
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

load_dotenv()

MODEL_PATH = Path(__file__).with_name("vendor_ranking_model.pkl")
DATABASE_URL = os.getenv("DATABASE_URL")

app = FastAPI(title="Service Sphere API", version="3.0.0")

# Create uploads directory and serve static files
UPLOAD_DIR = Path(__file__).with_name("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(UPLOAD_DIR)), name="uploads")

_DEFAULT_ORIGINS = "http://localhost:5173,http://127.0.0.1:5173"
_CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", _DEFAULT_ORIGINS).split(",") if o.strip()]
app.add_middleware(
    CORSMiddleware,
    allow_origins=_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CITIES = ["Kanpur", "Delhi", "Lucknow", "Gurugram", "Noida"]
CATEGORIES = [
    "Electrician", "Plumber", "Tutor", "Tiffin", "Bike Mechanic", "Salon",
    "Cleaner", "Carpenter", "Painter", "ACRepair",
    "Restaurant", "Sweets", "Cafe", "Provision Store", "Stationery",
    "Ice Cream", "Bakery", "Grocery", "Florist", "General Store",
]
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "1009125264293-gh5gcga6tosa7tse5e10r27upq7eip40.apps.googleusercontent.com")

sentiment_analyzer = SentimentIntensityAnalyzer()

try:
    ranking_model = joblib.load(MODEL_PATH)
except Exception:
    ranking_model = None


class PgCursorWrapper:
    """Wraps psycopg2 cursor to mimic sqlite3 Row interface."""
    def __init__(self, cur):
        self._cur = cur

    def execute(self, query, params=()):
        # Convert ? placeholders to %s for PostgreSQL
        q = query.replace("?", "%s")
        self._cur.execute(q, params)
        return self

    def fetchone(self):
        return self._cur.fetchone()

    def fetchall(self):
        return self._cur.fetchall()

    @property
    def lastrowid(self):
        # PostgreSQL: use RETURNING id or currval
        try:
            self._cur.execute("SELECT lastval()")
            row = self._cur.fetchone()
            return row["lastval"] if row else None
        except Exception:
            return None


def row_to_dict(row):
    if not row:
        return None
    data = dict(row)
    data.pop("password_hash", None)
    data.pop("password_salt", None)
    return data


def now_iso():
    return datetime.utcnow().isoformat() + "Z"


def make_password_hash(password: str):
    salt = secrets.token_hex(16)
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000).hex()
    return salt, hashed


def check_password(password: str, salt: str, password_hash: str):
    if not salt or not password_hash:
        return False
    hashed = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), 120000).hex()
    return secrets.compare_digest(hashed, password_hash)


def init_db():
    with connect() as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            identifier TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL CHECK(role IN ('customer', 'vendor')),
            city TEXT NOT NULL,
            auth_method TEXT NOT NULL DEFAULT 'otp',
            username TEXT,
            password_hash TEXT,
            password_salt TEXT,
            created_at TEXT NOT NULL
        )""")
        conn.execute("""
        CREATE TABLE IF NOT EXISTS otp_codes (
            id SERIAL PRIMARY KEY,
            identifier TEXT NOT NULL,
            code TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0
        )""")
        conn.execute("""
        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        )""")
        conn.execute("""
        CREATE TABLE IF NOT EXISTS vendors (
            id SERIAL PRIMARY KEY,
            owner_user_id INTEGER,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            city TEXT NOT NULL,
            area TEXT NOT NULL,
            price INTEGER NOT NULL,
            rating REAL NOT NULL DEFAULT 4.2,
            response_minutes INTEGER NOT NULL DEFAULT 30,
            distance_km REAL NOT NULL DEFAULT 3.0,
            phone TEXT,
            description TEXT,
            verified INTEGER NOT NULL DEFAULT 0,
            items TEXT DEFAULT '[]',
            photos TEXT DEFAULT '[]',
            created_at TEXT NOT NULL,
            FOREIGN KEY(owner_user_id) REFERENCES users(id)
        )""")
        conn.execute("""
        CREATE TABLE IF NOT EXISTS bookings (
            id SERIAL PRIMARY KEY,
            customer_user_id INTEGER NOT NULL,
            vendor_id INTEGER NOT NULL,
            service_category TEXT NOT NULL,
            city TEXT NOT NULL,
            address TEXT NOT NULL,
            preferred_time TEXT,
            notes TEXT,
            order_items TEXT DEFAULT '[]',
            total_amount INTEGER DEFAULT 0,
            status TEXT NOT NULL DEFAULT 'requested',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(customer_user_id) REFERENCES users(id),
            FOREIGN KEY(vendor_id) REFERENCES vendors(id)
        )""")
        conn.execute("""
        CREATE TABLE IF NOT EXISTS reviews (
            id SERIAL PRIMARY KEY,
            booking_id INTEGER NOT NULL UNIQUE,
            customer_user_id INTEGER NOT NULL,
            vendor_id INTEGER NOT NULL,
            rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
            comment TEXT,
            sentiment_label TEXT,
            sentiment_score REAL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(booking_id) REFERENCES bookings(id),
            FOREIGN KEY(customer_user_id) REFERENCES users(id),
            FOREIGN KEY(vendor_id) REFERENCES vendors(id)
        )""")

        # Add new columns if they don't exist (for existing databases)
        for col in ["items", "photos"]:
            try:
                conn.execute(f"ALTER TABLE vendors ADD COLUMN IF NOT EXISTS {col} TEXT DEFAULT '[]'")
            except Exception:
                pass
        for col in ["order_items", "total_amount"]:
            try:
                conn.execute(f"ALTER TABLE bookings ADD COLUMN IF NOT EXISTS {col} TEXT DEFAULT '[]'" if col == "order_items" else f"ALTER TABLE bookings ADD COLUMN IF NOT EXISTS {col} INTEGER DEFAULT 0")
            except Exception:
                pass

        # Create meta table for tracking seeding (prevents re-seeding after admin deletes)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS meta (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )""")

        # Only seed ONCE ever — check meta table, not vendor count
        seeded = conn.execute("SELECT value FROM meta WHERE key = 'seeded'").fetchone()
        if not seeded:
            seed_vendors(conn)
            conn.execute("INSERT INTO meta (key, value) VALUES ('seeded', 'true')")


def seed_vendors(conn):
    vendors = [
        ("Kanpur", "Electrician", "Sharma Electricals", "Kakadeo", 350, 4.8, 18, 1.2, "Fast fan, wiring and inverter repairs"),
        ("Kanpur", "Plumber", "Ganga Plumbing Works", "Swaroop Nagar", 300, 4.5, 22, 2.1, "Tap, leakage and bathroom fitting specialist"),
        ("Kanpur", "Tutor", "Neha Maths Classes", "Govind Nagar", 500, 4.9, 45, 3.4, "Maths and science tutor for school students"),
        ("Kanpur", "Tiffin", "Maa Ka Tiffin", "Barra", 90, 4.6, 25, 2.7, "Homely vegetarian lunch and dinner"),
        ("Delhi", "Electrician", "Metro Power Care", "Lajpat Nagar", 450, 4.7, 20, 1.8, "Same-day electrical services in South Delhi"),
        ("Delhi", "Plumber", "Capital Pipe Fix", "Rohini", 400, 4.4, 28, 3.1, "Emergency plumbing and installation"),
        ("Delhi", "Salon", "Glow Local Salon", "Karol Bagh", 700, 4.8, 35, 2.2, "Home salon for grooming and beauty"),
        ("Lucknow", "Tutor", "Aminabad Tutors", "Aminabad", 450, 4.6, 40, 2.4, "Personal tuition for classes 6-12"),
        ("Lucknow", "Bike Mechanic", "Nawab Bike Care", "Aliganj", 300, 4.5, 30, 1.9, "Two-wheeler repair and servicing"),
        ("Gurugram", "Tiffin", "Office Tiffin Hub", "Sector 44", 120, 4.7, 18, 1.5, "Healthy office meal subscriptions"),
        ("Gurugram", "Electrician", "Cyber City Electric", "DLF Phase 2", 550, 4.5, 25, 2.9, "Apartment and office electrical work"),
        ("Noida", "Plumber", "Noida Quick Plumb", "Sector 62", 380, 4.4, 26, 2.5, "Quick water leakage repairs"),
        ("Noida", "Salon", "Urban Glow Noida", "Sector 18", 650, 4.6, 32, 2.0, "At-home salon and grooming"),
    ]
    for city, category, name, area, price, rating, response, distance, desc in vendors:
        conn.execute(
            """INSERT INTO vendors
            (name, category, city, area, price, rating, response_minutes, distance_km, phone, description, verified, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (name, category, city, area, price, rating, response, distance, "9999999999", desc, 1, now_iso()),
        )


@app.on_event("startup")
def on_startup():
    init_db()


class OTPRequest(BaseModel):
    identifier: str = Field(..., description="Email or mobile number")
    name: str
    role: str = Field(..., pattern="^(customer|vendor)$")
    city: str


class OTPVerify(BaseModel):
    identifier: str
    otp: str
    name: str
    role: str = Field(..., pattern="^(customer|vendor)$")
    city: str


class PasswordRegisterRequest(BaseModel):
    name: str
    username: str = Field(..., min_length=3, max_length=30)
    email: str
    password: str = Field(..., min_length=6)
    role: str = Field(..., pattern="^(customer|vendor)$")
    city: str


class PasswordLoginRequest(BaseModel):
    username_or_email: str
    password: str


class GoogleLoginRequest(BaseModel):
    credential: str
    role: str = Field(..., pattern="^(customer|vendor)$")
    city: str


class VendorCreate(BaseModel):
    name: str
    category: str
    city: str
    area: str
    price: int
    response_minutes: int = 30
    distance_km: float = 3.0
    phone: str = ""
    description: str = ""
    items: str = "[]"
    photos: str = "[]"


class BookingCreate(BaseModel):
    vendor_id: int
    address: str
    preferred_time: Optional[str] = None
    notes: Optional[str] = None
    order_items: Optional[str] = "[]"
    total_amount: Optional[int] = 0


class BookingStatusUpdate(BaseModel):
    status: str = Field(..., pattern="^(accepted|rejected|in_progress|completed|cancelled)$")


class ReviewCreate(BaseModel):
    booking_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: Optional[str] = ""


def require_user(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Login required")
    token = authorization.split(" ", 1)[1].strip()
    with connect() as conn:
        row = conn.execute(
            """SELECT users.* FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token = ?""",
            (token,),
        ).fetchone()
    if not row:
        raise HTTPException(status_code=401, detail="Invalid session")
    return row_to_dict(row)


def vendor_score(vendor, weights):
    rating_w = float(weights.get("rating", 35))
    distance_w = float(weights.get("distance", 25))
    price_w = float(weights.get("price", 20))
    response_w = float(weights.get("response", 20))
    total = max(rating_w + distance_w + price_w + response_w, 1)

    rating_score = (vendor["rating"] / 5) * 100
    distance_score = max(0, 100 - vendor["distance_km"] * 12)
    price_score = max(0, 100 - vendor["price"] / 10)
    response_score = max(0, 100 - vendor["response_minutes"] * 1.5)

    return round(
        (rating_score * rating_w + distance_score * distance_w + price_score * price_w + response_score * response_w) / total,
        1,
    )


def ai_vendor_score(vendor):
    """ML-predicted quality score (0-100). Returns None if model isn't trained yet."""
    if ranking_model is None:
        return None
    features = [[vendor["rating"], vendor["distance_km"], vendor["price"], vendor["response_minutes"]]]
    try:
        score = ranking_model.predict(features)[0]
        return round(max(0, min(100, score)), 1)
    except Exception:
        return None


def classify_sentiment(compound_score: float) -> str:
    if compound_score >= 0.05:
        return "positive"
    if compound_score <= -0.05:
        return "negative"
    return "neutral"


@app.get("/api/health")
def health():
    return {"status": "ok", "project": "Service Sphere", "cities": CITIES, "ml_model_loaded": ranking_model is not None}


@app.get("/api/cities")
def cities():
    return CITIES


@app.get("/api/categories")
def categories():
    return CATEGORIES


@app.post("/api/auth/request-otp")
def request_otp(payload: OTPRequest):
    if payload.city not in CITIES:
        raise HTTPException(status_code=400, detail="Unsupported city")
    code = str(random.randint(100000, 999999))
    expires_at = (datetime.utcnow() + timedelta(minutes=10)).isoformat() + "Z"
    with connect() as conn:
        conn.execute(
            "INSERT INTO otp_codes (identifier, code, expires_at, used) VALUES (?, ?, ?, 0)",
            (payload.identifier, code, expires_at),
        )
    return {
        "message": "Demo OTP generated. In production, send this through SMS/email provider.",
        "demo_otp": code,
        "expires_in_minutes": 10,
    }


@app.post("/api/auth/verify-otp")
def verify_otp(payload: OTPVerify):
    with connect() as conn:
        otp_row = conn.execute(
            """SELECT * FROM otp_codes
            WHERE identifier = ? AND code = ? AND used = 0
            ORDER BY id DESC LIMIT 1""",
            (payload.identifier, payload.otp),
        ).fetchone()
        if not otp_row:
            raise HTTPException(status_code=400, detail="Invalid OTP")
        conn.execute("UPDATE otp_codes SET used = 1 WHERE id = ?", (otp_row["id"],))

        user = conn.execute("SELECT * FROM users WHERE identifier = ?", (payload.identifier,)).fetchone()
        if not user:
            conn.execute(
                "INSERT INTO users (name, identifier, role, city, auth_method, created_at) VALUES (?, ?, ?, ?, 'otp', ?)",
                (payload.name, payload.identifier, payload.role, payload.city, now_iso()),
            )
            user = conn.execute("SELECT * FROM users WHERE identifier = ?", (payload.identifier,)).fetchone()
        else:
            conn.execute(
                "UPDATE users SET name = ?, role = ?, city = ? WHERE identifier = ?",
                (payload.name, payload.role, payload.city, payload.identifier),
            )
            user = conn.execute("SELECT * FROM users WHERE identifier = ?", (payload.identifier,)).fetchone()

        token = secrets.token_urlsafe(32)
        conn.execute("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", (token, user["id"], now_iso()))
        return {"token": token, "user": row_to_dict(user)}


@app.post("/api/auth/register")
def register_with_password(payload: PasswordRegisterRequest):
    if payload.city not in CITIES:
        raise HTTPException(status_code=400, detail="Unsupported city")
    username = payload.username.strip().lower()
    email = payload.email.strip().lower()
    if "@" not in email:
        raise HTTPException(status_code=400, detail="Enter a valid email address")
    salt, password_hash = make_password_hash(payload.password)
    with connect() as conn:
        existing = conn.execute(
            "SELECT * FROM users WHERE lower(identifier) = ? OR lower(username) = ?",
            (email, username),
        ).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="Email or username already registered")
        conn.execute(
            """INSERT INTO users
            (name, identifier, username, role, city, auth_method, password_hash, password_salt, created_at)
            VALUES (?, ?, ?, ?, ?, 'password', ?, ?, ?)""",
            (payload.name, email, username, payload.role, payload.city, password_hash, salt, now_iso()),
        )
        user = conn.execute("SELECT * FROM users WHERE lower(identifier) = ?", (email,)).fetchone()
        token = secrets.token_urlsafe(32)
        conn.execute("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", (token, user["id"], now_iso()))
        return {"token": token, "user": row_to_dict(user)}


@app.post("/api/auth/login")
def login_with_password(payload: PasswordLoginRequest):
    value = payload.username_or_email.strip().lower()
    with connect() as conn:
        user = conn.execute(
            "SELECT * FROM users WHERE lower(identifier) = ? OR lower(username) = ?",
            (value, value),
        ).fetchone()
        if not user or not check_password(payload.password, user["password_salt"], user["password_hash"]):
            raise HTTPException(status_code=401, detail="Wrong username/email or password")
        token = secrets.token_urlsafe(32)
        conn.execute("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", (token, user["id"], now_iso()))
        return {"token": token, "user": row_to_dict(user)}


@app.get("/api/me")
def me(authorization: Optional[str] = Header(None)):
    return require_user(authorization)


@app.post("/api/auth/google")
def google_login(payload: GoogleLoginRequest):
    if payload.city not in CITIES:
        raise HTTPException(status_code=400, detail="Unsupported city")
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(status_code=500, detail="Google Client ID is not configured")
    try:
        info = id_token.verify_oauth2_token(
            payload.credential,
            google_requests.Request(),
            GOOGLE_CLIENT_ID,
        )
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google login token")

    email = info.get("email")
    name = info.get("name") or email or "Google User"
    if not email:
        raise HTTPException(status_code=400, detail="Google account email not available")

    identifier = email.lower()
    with connect() as conn:
        user = conn.execute("SELECT * FROM users WHERE identifier = ?", (identifier,)).fetchone()
        if not user:
            conn.execute(
                "INSERT INTO users (name, identifier, role, city, auth_method, created_at) VALUES (?, ?, ?, ?, 'google', ?)",
                (name, identifier, payload.role, payload.city, now_iso()),
            )
            user = conn.execute("SELECT * FROM users WHERE identifier = ?", (identifier,)).fetchone()
        else:
            conn.execute(
                "UPDATE users SET name = ?, role = ?, city = ?, auth_method = 'google' WHERE identifier = ?",
                (name, payload.role, payload.city, identifier),
            )
            user = conn.execute("SELECT * FROM users WHERE identifier = ?", (identifier,)).fetchone()

        token = secrets.token_urlsafe(32)
        conn.execute("INSERT INTO sessions (token, user_id, created_at) VALUES (?, ?, ?)", (token, user["id"], now_iso()))
        return {"token": token, "user": row_to_dict(user)}


@app.get("/api/vendors")
def list_vendors(
    city: Optional[str] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    rating: float = 35,
    distance: float = 25,
    price: float = 20,
    response: float = 20,
):
    query = "SELECT * FROM vendors WHERE 1=1"
    params = []
    if city:
        query += " AND city = ?"
        params.append(city)
    if category:
        query += " AND category = ?"
        params.append(category)
    if search:
        term = f"%{search.strip().lower()}%"
        query += """ AND (
            LOWER(name) LIKE ? OR
            LOWER(category) LIKE ? OR
            LOWER(description) LIKE ? OR
            LOWER(area) LIKE ?
        )"""
        params.extend([term, term, term, term])

    with connect() as conn:
        rows = conn.execute(query, params).fetchall()

    weights = {"rating": rating, "distance": distance, "price": price, "response": response}
    data = []
    for row in rows:
        v = row_to_dict(row)
        v["match_score"] = vendor_score(row, weights)
        data.append(v)

    # Batch AI predictions — disabled for performance (regular match_score works great)
    for v in data:
        v["ai_match_score"] = None

    return sorted(data, key=lambda x: x["match_score"], reverse=True)


@app.post("/api/vendors")
def create_vendor(payload: VendorCreate, authorization: Optional[str] = Header(None)):
    user = require_user(authorization)
    if user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Only vendor accounts can create vendor listings")
    if payload.city not in CITIES or payload.category not in CATEGORIES:
        raise HTTPException(status_code=400, detail="Invalid city or category")
    with connect() as conn:
        cur = conn.execute(
            """INSERT INTO vendors
            (owner_user_id, name, category, city, area, price, rating, response_minutes, distance_km, phone, description, verified, items, photos, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, 4.2, %s, %s, %s, %s, 0, %s, %s, %s)""",
            (user["id"], payload.name, payload.category, payload.city, payload.area, payload.price,
             payload.response_minutes, payload.distance_km, payload.phone, payload.description,
             payload.items, payload.photos, now_iso()),
        )
        vendor = conn.execute("SELECT * FROM vendors WHERE id = %s", (cur.lastrowid,)).fetchone()
    return row_to_dict(vendor)


@app.get("/api/vendors/{vendor_id}")
def get_vendor(vendor_id: int):
    with connect() as conn:
        vendor = conn.execute("SELECT * FROM vendors WHERE id = %s", (vendor_id,)).fetchone()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return row_to_dict(vendor)


@app.get("/api/my-vendor")
def get_my_vendor(authorization: Optional[str] = Header(None)):
    user = require_user(authorization)
    if user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Only vendor accounts")
    with connect() as conn:
        vendor = conn.execute("SELECT * FROM vendors WHERE owner_user_id = ?", (user["id"],)).fetchone()
    if not vendor:
        return None
    return row_to_dict(vendor)


class VendorUpdate(BaseModel):
    name: Optional[str] = None
    area: Optional[str] = None
    price: Optional[int] = None
    response_minutes: Optional[int] = None
    distance_km: Optional[int] = None
    phone: Optional[str] = None
    description: Optional[str] = None
    items: Optional[str] = None
    photos: Optional[str] = None


@app.patch("/api/vendors/{vendor_id}")
def update_vendor(vendor_id: int, payload: VendorUpdate, authorization: Optional[str] = Header(None)):
    user = require_user(authorization)
    with connect() as conn:
        vendor = conn.execute("SELECT * FROM vendors WHERE id = ?", (vendor_id,)).fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        if vendor["owner_user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Not your listing")
        fields = []
        params = []
        for k in ["name", "area", "price", "response_minutes", "distance_km", "phone", "description", "items", "photos"]:
            v = getattr(payload, k)
            if v is not None:
                fields.append(f"{k} = ?")
                params.append(v)
        if fields:
            params.append(vendor_id)
            conn.execute(f"UPDATE vendors SET {', '.join(fields)} WHERE id = ?", params)
        updated = conn.execute("SELECT * FROM vendors WHERE id = %s", (vendor_id,)).fetchone()
    return row_to_dict(updated)


@app.post("/api/upload")
async def upload_image(request: Request, file: UploadFile = File(...), authorization: Optional[str] = Header(None)):
    user = require_user(authorization)
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are allowed")
    ext = file.filename.rsplit(".", 1)[-1].lower() if file.filename and "." in file.filename else "jpg"
    if ext not in ["jpg", "jpeg", "png", "gif", "webp"]:
        ext = "jpg"
    filename = f"{secrets.token_hex(8)}.{ext}"
    filepath = UPLOAD_DIR / filename
    content = await file.read()
    with open(filepath, "wb") as f:
        f.write(content)
    base = os.getenv("BASE_URL", str(request.base_url).rstrip("/"))
    return {"url": f"{base}/uploads/{filename}", "filename": filename}


@app.post("/api/bookings")
def create_booking(payload: BookingCreate, authorization: Optional[str] = Header(None)):
    user = require_user(authorization)
    if user["role"] != "customer":
        raise HTTPException(status_code=403, detail="Only customers can create bookings")
    with connect() as conn:
        vendor = conn.execute("SELECT * FROM vendors WHERE id = %s", (payload.vendor_id,)).fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        cur = conn.execute(
            """INSERT INTO bookings
            (customer_user_id, vendor_id, service_category, city, address, preferred_time, notes, order_items, total_amount, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, 'requested', %s, %s)""",
            (user["id"], vendor["id"], vendor["category"], vendor["city"], payload.address,
             payload.preferred_time, payload.notes, payload.order_items, payload.total_amount, now_iso(), now_iso()),
        )
        booking = booking_with_details(conn, cur.lastrowid)
    return booking


def booking_with_details(conn, booking_id):
    row = conn.execute(
        """SELECT b.*, v.name AS vendor_name, v.area AS vendor_area, v.phone AS vendor_phone,
        u.name AS customer_name, u.identifier AS customer_identifier
        FROM bookings b
        JOIN vendors v ON v.id = b.vendor_id
        JOIN users u ON u.id = b.customer_user_id
        WHERE b.id = ?""",
        (booking_id,),
    ).fetchone()
    return row_to_dict(row)


@app.get("/api/bookings/customer")
def customer_bookings(authorization: Optional[str] = Header(None)):
    user = require_user(authorization)
    with connect() as conn:
        rows = conn.execute(
            """SELECT b.*, v.name AS vendor_name, v.area AS vendor_area, v.phone AS vendor_phone
            FROM bookings b JOIN vendors v ON v.id = b.vendor_id
            WHERE b.customer_user_id = ? ORDER BY b.id DESC""",
            (user["id"],),
        ).fetchall()
    return [row_to_dict(r) for r in rows]


@app.get("/api/bookings/vendor")
def vendor_bookings(authorization: Optional[str] = Header(None)):
    user = require_user(authorization)
    if user["role"] != "vendor":
        raise HTTPException(status_code=403, detail="Vendor account required")
    with connect() as conn:
        rows = conn.execute(
            """SELECT b.*, v.name AS vendor_name, v.area AS vendor_area,
            u.name AS customer_name, u.identifier AS customer_identifier
            FROM bookings b
            JOIN vendors v ON v.id = b.vendor_id
            JOIN users u ON u.id = b.customer_user_id
            WHERE v.owner_user_id = ? ORDER BY b.id DESC""",
            (user["id"],),
        ).fetchall()
    return [row_to_dict(r) for r in rows]


@app.patch("/api/bookings/{booking_id}/status")
def update_booking_status(booking_id: int, payload: BookingStatusUpdate, authorization: Optional[str] = Header(None)):
    user = require_user(authorization)
    with connect() as conn:
        booking = conn.execute(
            """SELECT b.*, v.owner_user_id FROM bookings b
            JOIN vendors v ON v.id = b.vendor_id WHERE b.id = ?""",
            (booking_id,),
        ).fetchone()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        allowed = booking["customer_user_id"] == user["id"] or booking["owner_user_id"] == user["id"]
        if not allowed:
            raise HTTPException(status_code=403, detail="You cannot update this booking")
        if payload.status == "cancelled" and booking["customer_user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="Only customer can cancel")
        conn.execute("UPDATE bookings SET status = ?, updated_at = ? WHERE id = ?", (payload.status, now_iso(), booking_id))
        return booking_with_details(conn, booking_id)


# ---------------- REVIEWS ----------------

@app.post("/api/reviews")
def create_review(payload: ReviewCreate, authorization: Optional[str] = Header(None)):
    user = require_user(authorization)
    with connect() as conn:
        booking = conn.execute("SELECT * FROM bookings WHERE id = ?", (payload.booking_id,)).fetchone()
        if not booking:
            raise HTTPException(status_code=404, detail="Booking not found")
        if booking["customer_user_id"] != user["id"]:
            raise HTTPException(status_code=403, detail="You can only review your own bookings")
        if booking["status"] != "completed":
            raise HTTPException(status_code=400, detail="You can only review completed bookings")

        existing = conn.execute("SELECT id FROM reviews WHERE booking_id = ?", (payload.booking_id,)).fetchone()
        if existing:
            raise HTTPException(status_code=400, detail="You already reviewed this booking")

        comment = (payload.comment or "").strip()
        sentiment_label = None
        sentiment_score = None
        if comment:
            scores = sentiment_analyzer.polarity_scores(comment)
            sentiment_score = scores["compound"]
            sentiment_label = classify_sentiment(sentiment_score)

        conn.execute(
            """INSERT INTO reviews
            (booking_id, customer_user_id, vendor_id, rating, comment, sentiment_label, sentiment_score, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
            (payload.booking_id, user["id"], booking["vendor_id"], payload.rating, comment,
             sentiment_label, sentiment_score, now_iso()),
        )

        avg_row = conn.execute(
            "SELECT AVG(rating) AS avg_rating FROM reviews WHERE vendor_id = ?",
            (booking["vendor_id"],),
        ).fetchone()
        if avg_row and avg_row["avg_rating"] is not None:
            conn.execute(
                "UPDATE vendors SET rating = ? WHERE id = ?",
                (round(avg_row["avg_rating"], 2), booking["vendor_id"]),
            )

        review = conn.execute("SELECT * FROM reviews WHERE booking_id = ?", (payload.booking_id,)).fetchone()
        return row_to_dict(review)


@app.get("/api/vendors/{vendor_id}/reviews")
def vendor_reviews(vendor_id: int):
    with connect() as conn:
        rows = conn.execute(
            """SELECT r.*, u.name AS customer_name
            FROM reviews r
            JOIN users u ON u.id = r.customer_user_id
            WHERE r.vendor_id = ?
            ORDER BY r.id DESC""",
            (vendor_id,),
        ).fetchall()
    return [row_to_dict(r) for r in rows]


# ==================== ADMIN ENDPOINTS ====================

ADMIN_USERNAME = "admin"
ADMIN_PASSWORD = "admin123"


class AdminLoginRequest(BaseModel):
    username: str
    password: str


@app.post("/api/admin/login")
def admin_login(payload: AdminLoginRequest):
    if payload.username != ADMIN_USERNAME or payload.password != ADMIN_PASSWORD:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")
    token = "admin_" + secrets.token_urlsafe(32)
    return {
        "token": token,
        "user": {
            "id": 0,
            "name": "Administrator",
            "role": "admin",
            "city": "All",
            "username": ADMIN_USERNAME,
        },
    }


def require_admin(authorization: Optional[str] = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Unauthorized")
    token = authorization.split(" ")[1]
    if not token.startswith("admin_"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return {"id": 0, "name": "Administrator", "role": "admin"}


@app.get("/api/admin/stats")
def admin_stats(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    with connect() as conn:
        total_users = conn.execute("SELECT COUNT(*) AS c FROM users").fetchone()["c"]
        total_vendors = conn.execute("SELECT COUNT(*) AS c FROM vendors").fetchone()["c"]
        total_bookings = conn.execute("SELECT COUNT(*) AS c FROM bookings").fetchone()["c"]
        total_reviews = conn.execute("SELECT COUNT(*) AS c FROM reviews").fetchone()["c"]
        customers = conn.execute("SELECT COUNT(*) AS c FROM users WHERE role='customer'").fetchone()["c"]
        vendors_u = conn.execute("SELECT COUNT(*) AS c FROM users WHERE role='vendor'").fetchone()["c"]
        pending_vendors = conn.execute("SELECT COUNT(*) AS c FROM vendors WHERE verified=0").fetchone()["c"]
        verified_vendors = conn.execute("SELECT COUNT(*) AS c FROM vendors WHERE verified=1").fetchone()["c"]
        completed = conn.execute("SELECT COUNT(*) AS c FROM bookings WHERE status='completed'").fetchone()["c"]
        pending_bookings = conn.execute("SELECT COUNT(*) AS c FROM bookings WHERE status='requested'").fetchone()["c"]
        cancelled = conn.execute("SELECT COUNT(*) AS c FROM bookings WHERE status='cancelled'").fetchone()["c"]
        # city-wise stats
        city_stats = conn.execute(
            "SELECT city, COUNT(*) AS c FROM users GROUP BY city ORDER BY c DESC"
        ).fetchall()
        # category-wise vendors
        cat_stats = conn.execute(
            "SELECT category, COUNT(*) AS c FROM vendors GROUP BY category ORDER BY c DESC"
        ).fetchall()
    return {
        "total_users": total_users,
        "total_vendors": total_vendors,
        "total_bookings": total_bookings,
        "total_reviews": total_reviews,
        "customers": customers,
        "vendors": vendors_u,
        "pending_vendors": pending_vendors,
        "verified_vendors": verified_vendors,
        "completed_bookings": completed,
        "pending_bookings": pending_bookings,
        "cancelled_bookings": cancelled,
        "city_stats": [row_to_dict(r) for r in city_stats],
        "category_stats": [row_to_dict(r) for r in cat_stats],
    }


@app.get("/api/admin/users")
def admin_users(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    with connect() as conn:
        rows = conn.execute(
            "SELECT id, name, identifier, username, role, city, auth_method, created_at FROM users ORDER BY id DESC"
        ).fetchall()
    return [row_to_dict(r) for r in rows]


@app.get("/api/admin/vendors")
def admin_vendors(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    with connect() as conn:
        rows = conn.execute(
            """SELECT v.*, u.name AS owner_name FROM vendors v
            LEFT JOIN users u ON u.id = v.owner_user_id
            ORDER BY v.id DESC"""
        ).fetchall()
    return [row_to_dict(r) for r in rows]


@app.get("/api/admin/bookings")
def admin_bookings(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    with connect() as conn:
        rows = conn.execute(
            """SELECT b.*, u.name AS customer_name, v.name AS vendor_name
            FROM bookings b
            JOIN users u ON u.id = b.customer_user_id
            JOIN vendors v ON v.id = b.vendor_id
            ORDER BY b.id DESC"""
        ).fetchall()
    return [row_to_dict(r) for r in rows]


@app.get("/api/admin/reviews")
def admin_reviews(authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    with connect() as conn:
        rows = conn.execute(
            """SELECT r.*, u.name AS customer_name, v.name AS vendor_name
            FROM reviews r
            JOIN users u ON u.id = r.customer_user_id
            JOIN vendors v ON v.id = r.vendor_id
            ORDER BY r.id DESC"""
        ).fetchall()
    return [row_to_dict(r) for r in rows]


@app.patch("/api/admin/vendors/{vendor_id}/verify")
def admin_verify_vendor(vendor_id: int, authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    with connect() as conn:
        conn.execute("UPDATE vendors SET verified = 1 WHERE id = ?", (vendor_id,))
        vendor = conn.execute("SELECT * FROM vendors WHERE id = ?", (vendor_id,)).fetchone()
    return row_to_dict(vendor)


@app.delete("/api/admin/vendors/{vendor_id}")
def admin_delete_vendor(vendor_id: int, authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    with connect() as conn:
        conn.execute("DELETE FROM vendors WHERE id = ?", (vendor_id,))
    return {"ok": True}


@app.delete("/api/admin/users/{user_id}")
def admin_delete_user(user_id: int, authorization: Optional[str] = Header(None)):
    require_admin(authorization)
    with connect() as conn:
        conn.execute("DELETE FROM sessions WHERE user_id = ?", (user_id,))
        conn.execute("DELETE FROM vendors WHERE owner_user_id = ?", (user_id,))
        conn.execute("DELETE FROM users WHERE id = ?", (user_id,))
    return {"ok": True}