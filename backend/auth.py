import os
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import schemas, database, models

# Secret key for JWT. MUST be set in environment in production.
# Falls back to an insecure dev value only when ENV != "production".
_DEV_FALLBACK_SECRET = "larianhub_dev_only_do_not_use_in_prod"
_env_secret = os.getenv("JWT_SECRET")
if not _env_secret and os.getenv("ENV", "development").lower() == "production":
    raise RuntimeError(
        "JWT_SECRET environment variable is required in production. "
        "Generate one with: python -c 'import secrets; print(secrets.token_urlsafe(64))'"
    )
SECRET_KEY: str = _env_secret or _DEV_FALLBACK_SECRET

ALGORITHM = "HS256"
# 12 hours — short enough to limit damage from stolen tokens, long enough
# for a normal admin work session without forcing constant re-login.
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "720"))

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/admin/login")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

async def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = schemas.TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = db.query(models.Admin).filter(models.Admin.username == token_data.username).first()
    if user is None:
        raise credentials_exception
    return user
