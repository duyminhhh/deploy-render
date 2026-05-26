from fastapi import APIRouter, Depends, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session, joinedload
from typing import List, Dict
import json
from datetime import datetime
from database import get_db, SessionLocal
import models, schemas
from auth import get_current_user
from jose import jwt, JWTError
from auth import SECRET_KEY, ALGORITHM

router = APIRouter(prefix="/chat", tags=["Chat"])

class ConnectionManager:
    def __init__(self):
        self.active: Dict[int, WebSocket] = {}  # user_id -> websocket

    async def connect(self, user_id: int, ws: WebSocket):
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: int):
        self.active.pop(user_id, None)

    async def broadcast(self, message: dict, exclude: int = None):
        dead = []
        for uid, ws in self.active.items():
            if uid == exclude:
                continue
            try:
                await ws.send_json(message)
            except Exception:
                dead.append(uid)
        for uid in dead:
            self.active.pop(uid, None)

    async def send_to(self, user_id: int, message: dict):
        ws = self.active.get(user_id)
        if ws:
            try:
                await ws.send_json(message)
            except Exception:
                self.active.pop(user_id, None)

manager = ConnectionManager()

@router.get("/messages", response_model=List[schemas.ChatMessageOut])
def get_messages(
    limit: int = Query(50),
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user)
):
    return db.query(models.ChatMessage).options(
        joinedload(models.ChatMessage.sender)
    ).order_by(models.ChatMessage.created_at.desc()).limit(limit).all()[::-1]

@router.websocket("/ws")
async def websocket_endpoint(ws: WebSocket, token: str = Query(...)):
    # Authenticate via token query param
    db = SessionLocal()
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        user = db.query(models.User).filter(models.User.username == username).first()
        if not user:
            await ws.close(code=4001)
            return
    except JWTError:
        await ws.close(code=4001)
        return
    finally:
        db.close()

    await manager.connect(user.id, ws)
    # Send online notification
    await manager.broadcast({
        "type": "user_joined",
        "user_id": user.id,
        "username": user.full_name or user.username,
        "role": user.role
    }, exclude=user.id)

    try:
        while True:
            data = await ws.receive_text()
            msg_data = json.loads(data)
            content = msg_data.get("content", "").strip()
            if not content:
                continue

            db2 = SessionLocal()
            try:
                msg = models.ChatMessage(sender_id=user.id, content=content)
                db2.add(msg)
                db2.commit()
                db2.refresh(msg)
                msg_out = {
                    "type": "message",
                    "id": msg.id,
                    "sender_id": user.id,
                    "sender_name": user.full_name or user.username,
                    "sender_role": user.role,
                    "content": content,
                    "created_at": msg.created_at.isoformat()
                }
                # Send to all including sender
                await ws.send_json(msg_out)
                await manager.broadcast(msg_out, exclude=user.id)
            finally:
                db2.close()

    except WebSocketDisconnect:
        manager.disconnect(user.id)
        await manager.broadcast({
            "type": "user_left",
            "user_id": user.id,
            "username": user.username
        })