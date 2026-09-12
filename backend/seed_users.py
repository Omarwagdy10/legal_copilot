import bcrypt
from database import SessionLocal
from models import User

USERS=[('reviewer1','123456','reviewer'),('counsel1','123456','counsel')]
for username,password,role in USERS:
    db=SessionLocal()
    try:
        user=db.query(User).filter(User.username==username).first()
        if user:
            print(f'{username} already exists.')
        else:
            db.add(User(username=username,password_hash=bcrypt.hashpw(password.encode(),bcrypt.gensalt()).decode(),role=role))
            db.commit(); print(f'{username} created successfully.')
    finally: db.close()
