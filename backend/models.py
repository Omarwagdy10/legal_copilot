from sqlalchemy import Column, Integer, String, DateTime, Text
from sqlalchemy.sql import func
from database import Base


class Document(Base):
    __tablename__ = 'documents'

    id = Column(Integer, primary_key=True, index=True)
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False, unique=True)
    status = Column(String(50), nullable=False, default='uploaded')
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Review(Base):
    __tablename__ = 'reviews'

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, nullable=False)
    status = Column(String(50), nullable=False, default='completed')
    memo = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class Approval(Base):
    __tablename__ = 'approvals'

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, nullable=False)
    review_id = Column(Integer, nullable=False)
    decision = Column(String(50), nullable=False)
    decided_by_user_id = Column(Integer, nullable=True)
    comment = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class RiskAssessment(Base):
    __tablename__ = 'risk_assessments'

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, nullable=False)
    review_id = Column(Integer, nullable=False)
    clause_title = Column(String(255), nullable=False)
    risk_level = Column(String(50), nullable=False)
    reason = Column(Text, nullable=True)
    evidence = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class DeviationResult(Base):
    __tablename__ = 'deviation_results'

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, nullable=False, index=True)
    clause_title = Column(String(255), nullable=False)
    clause_text = Column(Text, nullable=True)
    playbook_rule = Column(Text, nullable=True)
    deviation_json = Column(Text, nullable=True)
    reason = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())


class User(Base):
    __tablename__ = 'users'

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False, unique=True, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default='reviewer')
    created_at = Column(DateTime, server_default=func.now())


class Run(Base):
    __tablename__ = 'runs'

    id = Column(String(36), primary_key=True)
    document_id = Column(Integer, nullable=True)
    user_id = Column(Integer, nullable=True)
    workflow = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)
    correlation_id = Column(String(64), nullable=False, index=True)
    total_steps = Column(Integer, nullable=False, default=0)
    completed_steps = Column(Integer, nullable=False, default=0)
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)


class RunStep(Base):
    __tablename__ = 'run_steps'

    id = Column(Integer, primary_key=True, index=True)
    run_id = Column(String(36), nullable=False, index=True)
    step_name = Column(String(100), nullable=False)
    agent_name = Column(String(100), nullable=False)
    status = Column(String(50), nullable=False)
    detail = Column(Text, nullable=True)
    started_at = Column(DateTime, server_default=func.now())
    completed_at = Column(DateTime, nullable=True)
