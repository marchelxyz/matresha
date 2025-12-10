"""
Database models and initialization for chat history
"""
import os
from datetime import datetime, timezone
from sqlalchemy import create_engine, Column, Integer, String, Text, DateTime, ForeignKey, JSON
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship

Base = declarative_base()


class ChatGroup(Base):
    """Chat group model - для группировки чатов (например, 'Учеба', 'Работа')"""
    __tablename__ = 'chat_groups'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(100), nullable=False, index=True)  # Telegram user ID
    name = Column(String(200), nullable=False)  # Название группы
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationship to chats
    chats = relationship("Chat", back_populates="group", cascade="all, delete-orphan")
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'name': self.name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'chat_count': len(self.chats) if self.chats else 0
        }


class Chat(Base):
    """Chat session model"""
    __tablename__ = 'chats'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(String(100), nullable=False, index=True)  # Telegram user ID
    user_name = Column(String(200))  # User's first name
    username = Column(String(200))  # Telegram username
    provider = Column(String(50), default='openai')  # AI provider used
    group_id = Column(Integer, ForeignKey('chat_groups.id'), nullable=True, index=True)  # Группа чата
    title = Column(String(200))  # Название чата (генерируется из первого сообщения)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    
    # Relationships
    messages = relationship("Message", back_populates="chat", cascade="all, delete-orphan")
    group = relationship("ChatGroup", back_populates="chats")
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': self.user_name,
            'username': self.username,
            'provider': self.provider,
            'group_id': self.group_id,
            'title': self.title,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'message_count': len(self.messages) if self.messages else 0
        }


class Message(Base):
    """Message model"""
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    chat_id = Column(Integer, ForeignKey('chats.id'), nullable=False, index=True)
    role = Column(String(20), nullable=False)  # 'user' or 'assistant'
    content = Column(Text, nullable=False)
    provider = Column(String(50))  # AI provider used for this message
    temperature = Column(String(10))  # Temperature setting
    max_tokens = Column(Integer)  # Max tokens setting
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relationship to chat
    chat = relationship("Chat", back_populates="messages")
    
    def to_dict(self):
        return {
            'id': self.id,
            'chat_id': self.chat_id,
            'role': self.role,
            'content': self.content,
            'provider': self.provider,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }


# Database setup
def get_database_url():
    """Get database URL from environment or use SQLite default for local development"""
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        # PostgreSQL URL format: postgresql://user:pass@host:port/dbname
        # PostgreSQL URL format (Railway): postgres://user:pass@host:port/dbname
        # SQLite URL format: sqlite:///path/to/db.sqlite
        return db_url
    else:
        # Default to SQLite only for local development
        # In production, DATABASE_URL should be set (e.g., on Railway)
        import warnings
        warnings.warn(
            "DATABASE_URL not set. Using SQLite for local development. "
            "For production, set DATABASE_URL environment variable to use PostgreSQL.",
            UserWarning
        )
        db_path = os.path.join(os.path.dirname(__file__), 'chat_history.db')
        return f'sqlite:///{db_path}'


def init_database():
    """Initialize database connection and create tables"""
    database_url = get_database_url()
    
    # Normalize PostgreSQL URL (Railway uses postgres:// but SQLAlchemy needs postgresql://)
    if database_url.startswith('postgres://'):
        database_url = database_url.replace('postgres://', 'postgresql://', 1)
    
    # For SQLite, use check_same_thread=False for Flask compatibility
    if database_url.startswith('sqlite'):
        engine = create_engine(
            database_url,
            connect_args={'check_same_thread': False},
            echo=False  # Set to True for SQL debugging
        )
    else:
        engine = create_engine(database_url, echo=False)
    
    # Create all tables
    Base.metadata.create_all(engine)
    
    # Create session factory
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    return engine, SessionLocal


# Initialize database on import
engine, SessionLocal = init_database()


def get_db():
    """Get database session (for use in Flask routes)"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
