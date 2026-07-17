from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, timedelta
from pathlib import Path
import sqlite3
import secrets
import random
import hashlib
import os
import joblib
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

DB_PATH = Path(__file__).with_name("mohalla_mitra.db")
MODEL_PATH = Path(__file__).with_name("vendor_ranking_model.pkl")

app = FastAPI(title="Mohalla Mitra API", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CITIES = ["Kanpur", "Delhi", "Lucknow", "Gurugram", "Noida"]
CATEGORIES = ["Electrician", "Plumber", "Tutor", "Tiffin", "Bike Mechanic", "Salon"]
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "1009125264293-gh5gcga6tosa7tse5e10r27upq7eip40.apps.googleusercontent.com")

sentiment_analyzer = SentimentIntensityAnalyzer()

try:
    ranking_model = joblib.load(MODEL_PATH)
except Exception:
    ranking_model = None


def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


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
        conn.executescript("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            identifier TEXT NOT NULL UNIQUE,
            role TEXT NOT NULL CHECK(role IN ('customer', 'vendor')),
            city TEXT NOT NULL,
            auth_method TEXT NOT NULL DEFAULT 'otp',
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS otp_codes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            identifier TEXT NOT NULL,
            code TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            used INTEGER NOT NULL DEFAULT 0
        );

        CREATE TABLE IF NOT EXISTS sessions (
            token TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            created_at TEXT NOT NULL,
            FOREIGN KEY(user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS vendors (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
            created_at TEXT NOT NULL,
            FOREIGN KEY(owner_user_id) REFERENCES users(id)
        );

        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            customer_user_id INTEGER NOT NULL,
            vendor_id INTEGER NOT NULL,
            service_category TEXT NOT NULL,
            city TEXT NOT NULL,
            address TEXT NOT NULL,
            preferred_time TEXT,
            notes TEXT,
            status TEXT NOT NULL DEFAULT 'requested',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(customer_user_id) REFERENCES users(id),
            FOREIGN KEY(vendor_id) REFERENCES vendors(id)
        );

        CREATE TABLE IF NOT EXISTS reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
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
        );
        """)

        user_columns = [r["name"] for r in conn.execute("PRAGMA table_info(users)").fetchall()]
        if "username" not in user_columns:
            conn.execute("ALTER TABLE users ADD COLUMN username TEXT")
        if "password_hash" not in user_columns:
            conn.execute("ALTER TABLE users ADD COLUMN password_hash TEXT")
        if "password_salt" not in user_columns:
            conn.execute("ALTER TABLE users ADD COLUMN password_salt TEXT")

        existing = conn.execute("SELECT COUNT(*) AS count FROM vendors").fetchone()["count"]
        if existing == 0:
            seed_vendors(conn)


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


class BookingCreate(BaseModel):
    vendor_id: int
    address: str
    preferred_time: Optional[str] = None
    notes: Optional[str] = None


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
    return {"status": "ok", "project": "Mohalla Mitra", "cities": CITIES, "ml_model_loaded": ranking_model is not None}


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
        v["ai_match_score"] = ai_vendor_score(row)
        data.append(v)
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
            (owner_user_id, name, category, city, area, price, rating, response_minutes, distance_km, phone, description, verified, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 4.2, ?, ?, ?, ?, 0, ?)""",
            (user["id"], payload.name, payload.category, payload.city, payload.area, payload.price,
             payload.response_minutes, payload.distance_km, payload.phone, payload.description, now_iso()),
        )
        vendor = conn.execute("SELECT * FROM vendors WHERE id = ?", (cur.lastrowid,)).fetchone()
    return row_to_dict(vendor)


@app.post("/api/bookings")
def create_booking(payload: BookingCreate, authorization: Optional[str] = Header(None)):
    user = require_user(authorization)
    if user["role"] != "customer":
        raise HTTPException(status_code=403, detail="Only customers can create bookings")
    with connect() as conn:
        vendor = conn.execute("SELECT * FROM vendors WHERE id = ?", (payload.vendor_id,)).fetchone()
        if not vendor:
            raise HTTPException(status_code=404, detail="Vendor not found")
        cur = conn.execute(
            """INSERT INTO bookings
            (customer_user_id, vendor_id, service_category, city, address, preferred_time, notes, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'requested', ?, ?)""",
            (user["id"], vendor["id"], vendor["category"], vendor["city"], payload.address,
             payload.preferred_time, payload.notes, now_iso(), now_iso()),
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