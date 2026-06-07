import os
import sys

# Setup python path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.models import Base, User
from app.auth import hash_password, generate_session_token

def test():
    db_url = os.environ.get("DATABASE_URL")
    print(f"DATABASE_URL: {db_url}")
    if not db_url:
        print("Error: DATABASE_URL not set in environment.")
        return
        
    if db_url.startswith("postgresql+asyncpg://"):
        db_url = db_url.replace("postgresql+asyncpg://", "postgresql://", 1)
    engine = create_engine(db_url)
    Session = sessionmaker(bind=engine)
    db = Session()
    
    email = "testuser@example.com"
    password = "password123"
    
    try:
        print("Querying user...")
        user = db.query(User).filter(User.email == email).first()
        print(f"User query result: {user}")
        
        if not user:
            print("Creating user...")
            user = User(email=email, password_hash=hash_password(password))
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"User created successfully: {user.id}")
        else:
            print(f"User exists: {user.id}")
            
        token = generate_session_token(str(user.id), user.email)
        print(f"Session token generated: {token}")
        
    except Exception as e:
        import traceback
        print("\n--- ERROR DETECTED ---")
        traceback.print_exc()
        print("----------------------\n")

if __name__ == "__main__":
    test()
