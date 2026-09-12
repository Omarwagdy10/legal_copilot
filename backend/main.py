import json, os, uuid, re
from datetime import datetime, timezone, timedelta
from pathlib import Path
import chromadb
import bcrypt
from fastapi import FastAPI, File, UploadFile, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from pydantic import BaseModel
from pypdf import PdfReader
from sqlalchemy import select
from sqlalchemy.orm import Session
from database import get_db
from models import Document, Review, Approval, RiskAssessment, User, Run, RunStep, DeviationResult
from core_config import settings
from services.llm_service import generate_ai_response, generate_json_response
from services.rag_service import get_embedding_model, hybrid_search, language_of
from agents.legal_agents import ClauseExtractorAgent, RiskAssessorAgent, MemoDrafterAgent, LegalReviewOrchestrator

BASE_DIR = Path(__file__).resolve().parent
PLAYBOOK = json.loads((BASE_DIR / 'playbook.json').read_text(encoding='utf-8'))
chroma_client = chromadb.PersistentClient(path=str(BASE_DIR / 'chroma_db'))
collection = chroma_client.get_or_create_collection(name='legal_documents')
app = FastAPI(title='Legal Copilot API', version='1.0.0')
security = HTTPBearer(auto_error=True)

app.add_middleware(CORSMiddleware,
    allow_origins=[   "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:5174",
        "http://127.0.0.1:5174",],
    allow_credentials=True, allow_methods=['*'], allow_headers=['*'])

class LoginRequest(BaseModel):
    username: str
    password: str

class ApprovalRequest(BaseModel):
    decision: str
    comment: str | None = None


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security), db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(credentials.credentials, settings.jwt_secret_key, algorithms=['HS256'])
        user_id = int(payload.get('sub'))
    except (JWTError, TypeError, ValueError):
        raise HTTPException(401, 'Invalid or expired authentication token.')
    user = db.get(User, user_id)
    if not user:
        raise HTTPException(401, 'User not found.')
    return user

def require_role(role):
    def dep(user: User = Depends(get_current_user)):
        if user.role != role:
            raise HTTPException(403, f'Only {role} users can perform this action.')
        return user
    return dep

def unique_filename(filename):
    safe = os.path.basename(filename).strip()
    if not safe or Path(safe).suffix.lower() not in {'.pdf', '.txt'}:
        raise HTTPException(400, 'Only PDF and TXT files are supported.')
    stem, ext = os.path.splitext(safe)
    candidate=safe; n=1
    upload_dir=BASE_DIR/'uploads'; upload_dir.mkdir(exist_ok=True)
    while (upload_dir/candidate).exists():
        candidate=f'{stem}_{n}{ext}'; n += 1
    return candidate

def extract_text(filename):
    path=BASE_DIR/'uploads'/filename
    if not path.exists(): raise HTTPException(404, 'Document file not found.')
    if path.suffix.lower()=='.txt': return path.read_text(encoding='utf-8', errors='ignore')
    reader=PdfReader(str(path))
    return '\n'.join((p.extract_text() or '') for p in reader.pages)

def clean_text(text):
    return re.sub(r'\s+', ' ', text).strip()

def find_matching_rule(title):
    normalized=title.lower()
    for rule in PLAYBOOK['rules']:
        for key in rule.get('clause_aliases', [rule['clause']]):
            if key.lower() in normalized: return rule
    return None

def make_run(db, document_id, user_id, workflow, total_steps, correlation_id):
    run=Run(id=str(uuid.uuid4()), document_id=document_id, user_id=user_id, workflow=workflow,
            status='running', correlation_id=correlation_id, total_steps=total_steps)
    db.add(run); db.commit(); db.refresh(run); return run

def record_step(db, run, name, agent, status, detail):
    step=RunStep(run_id=run.id, step_name=name, agent_name=agent, status=status,
                  detail=json.dumps(detail, ensure_ascii=False))
    db.add(step); db.commit(); return step

@app.get('/')
def home(): return {'message':'Legal Copilot API is running','health':'ok'}

@app.get('/health')
def health(): return {'status':'ok'}

@app.post('/auth/login')
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user=db.query(User).filter(User.username==data.username).first()
    if not user or not bcrypt.checkpw(data.password.encode(), user.password_hash.encode()):
        raise HTTPException(401, 'Invalid username or password.')
    exp=datetime.now(timezone.utc)+timedelta(minutes=settings.access_token_expire_minutes)
    token=jwt.encode({'sub':str(user.id),'username':user.username,'role':user.role,'exp':exp}, settings.jwt_secret_key, algorithm='HS256')
    return {'access_token':token,'token_type':'bearer','role':user.role,'username':user.username}

def run_document_indexing(filename: str, db: Session):
    text = clean_text(extract_text(filename))
    clauses = ClauseExtractorAgent().run(text)
    chunks = clauses.get('clauses', [])
    if not chunks:
        raise RuntimeError('No clauses could be extracted from the document.')

    model = get_embedding_model()
    embeddings = model.encode([c.get('text', '') for c in chunks])
    ids = [f'{filename}-{i}' for i in range(len(chunks))]
    metadata = [
        {
            'filename': filename,
            'chunk_index': i,
            'section': c.get('section', c.get('title', '')),
            'language': language_of(c.get('text', '')),
            'source': 'contract'
        }
        for i, c in enumerate(chunks)
    ]

    collection.upsert(
        ids=ids,
        documents=[c.get('text', '') for c in chunks],
        embeddings=embeddings.tolist(),
        metadatas=metadata
    )

    doc = db.query(Document).filter(Document.stored_filename == filename).first()
    if doc:
        doc.status = 'indexed'
        db.commit()

    return len(chunks)

@app.post('/documents/upload')
async def upload_document(file: UploadFile=File(...), db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    if not file.filename:
        raise HTTPException(400, 'A filename is required.')

    content = await file.read()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, f'Max upload size is {settings.max_upload_mb} MB.')

    stored = unique_filename(file.filename)
    (BASE_DIR / 'uploads' / stored).write_bytes(content)

    doc = Document(
        original_filename=os.path.basename(file.filename),
        stored_filename=stored,
        status='uploaded'
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    try:
        chunk_count = run_document_indexing(stored, db)
        message = 'Document uploaded and indexed successfully.'
    except Exception as exc:
        doc.status = 'failed'
        db.commit()
        chunk_count = 0
        message = f'Document uploaded, but automatic indexing failed: {exc}'

    return {
        'id': doc.id,
        'filename': stored,
        'status': doc.status,
        'number_of_chunks': chunk_count,
        'message': message
    }

@app.get('/documents')
def get_documents(db: Session=Depends(get_db), user: User=Depends(get_current_user)):
    docs=db.scalars(select(Document).order_by(Document.created_at.desc())).all()
    return {'documents':[{'id':d.id,'original_filename':d.original_filename,'stored_filename':d.stored_filename,'status':d.status,
        'created_at':d.created_at,'updated_at':d.updated_at} for d in docs]}

@app.post('/documents/index/{filename}')
def index_document(filename:str, db:Session=Depends(get_db), user:User=Depends(get_current_user)):
    try:
        chunk_count = run_document_indexing(filename, db)
    except RuntimeError as exc:
        raise HTTPException(422, str(exc))
    except Exception as exc:
        doc = db.query(Document).filter(Document.stored_filename == filename).first()
        if doc:
            doc.status = 'failed'
            db.commit()
        raise HTTPException(503, f'Indexing failed: {exc}')

    return {
        'filename': filename,
        'number_of_chunks': chunk_count,
        'message': 'Document indexed successfully.'
    }

@app.get('/documents/search')
def search_documents(query:str, user:User=Depends(get_current_user)):
    return {'query':query,'results':hybrid_search(collection,query,top_k=5)}

@app.get('/ask')
def ask_question(query:str, user:User=Depends(get_current_user)):
    results=hybrid_search(collection,query,top_k=5)
    if not results or results[0]['fusion_score'] < settings.min_evidence_score:
        return {'question':query,'answer':'Not enough information in the document.','sources':[]}
    context='\n\n'.join(f"[{i+1}] {r['text']}" for i,r in enumerate(results))
    prompt = (
        f"You are a legal assistant. Answer ONLY from the supplied context. "
        f"Respect the language of the user. If evidence is insufficient, say exactly: Not enough information in the document.\n\n"
        f"Context:\n{context}\n\nQuestion:\n{query}"
    )
    answer=generate_ai_response(prompt)
    return {'question':query,'answer':answer,'sources':results}


def serialize_deviation_results(filename, rows):
    return {
        'filename': filename,
        'results': [
            {
                'title': row.clause_title,
                'text': row.clause_text,
                'rule': json.loads(row.playbook_rule) if row.playbook_rule else None,
                'deviation': json.loads(row.deviation_json) if row.deviation_json else None,
                'reason': row.reason,
            }
            for row in rows
        ]
    }


@app.get("/documents/deviation/{filename}")
def get_deviation(filename: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    document = db.query(Document).filter(Document.stored_filename == filename).first()
    if not document:
        raise HTTPException(404, 'Document not found.')

    rows = db.query(DeviationResult).filter(
        DeviationResult.document_id == document.id
    ).order_by(DeviationResult.id).all()

    if not rows:
        raise HTTPException(404, 'No saved deviation result found for this document.')

    return serialize_deviation_results(filename, rows)


@app.post("/documents/deviation/{filename}")
def analyze_deviation(
    filename: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    document = db.query(Document).filter(Document.stored_filename == filename).first()
    if not document:
        raise HTTPException(404, 'Document not found.')

    existing = db.query(DeviationResult).filter(
        DeviationResult.document_id == document.id
    ).order_by(DeviationResult.id).all()

    if existing:
        return {
            **serialize_deviation_results(filename, existing),
            'cached': True
        }

    try:
        text = clean_text(extract_text(filename))
        clauses = ClauseExtractorAgent().run(text)
        results = []

        for clause in clauses.get("clauses", []):
            title = clause.get("title", "")
            clause_text = clause.get("text", "")
            rule = find_matching_rule(title)

            if not rule:
                deviation = None
                reason = "No matching playbook rule"
            else:
                prompt_path = BASE_DIR / "prompts" / "deviation.txt"
                prompt = prompt_path.read_text(encoding="utf-8")
                prompt += (
                    f"\nContract Clause:\n{clause_text}\n\n"
                    f"Playbook Rule:\n{json.dumps(rule, ensure_ascii=False)}"
                )
                deviation = generate_json_response(prompt)
                reason = deviation.get('reason', '') if isinstance(deviation, dict) else ''

            results.append({
                "title": title,
                "text": clause_text,
                "rule": rule,
                "deviation": deviation,
                "reason": reason,
            })

            db.add(DeviationResult(
                document_id=document.id,
                clause_title=title,
                clause_text=clause_text,
                playbook_rule=json.dumps(rule, ensure_ascii=False) if rule else None,
                deviation_json=json.dumps(deviation, ensure_ascii=False) if deviation is not None else None,
                reason=reason,
            ))

        db.commit()
        rows = db.query(DeviationResult).filter(
            DeviationResult.document_id == document.id
        ).order_by(DeviationResult.id).all()

        return {
            **serialize_deviation_results(filename, rows),
            'cached': False
        }

    except RuntimeError as exc:
        db.rollback()
        raise HTTPException(status_code=503, detail=str(exc))
    except HTTPException:
        db.rollback()
        raise
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Deviation analysis failed: {exc}")


def serialize_saved_review(filename, document, review, risks, approvals):
    return {
        'filename': filename,
        'reviewed_by': None,
        'run_id': None,
        'correlation_id': None,
        'cached': True,
        'review': {
            'risks': [
                {
                    'title': r.clause_title,
                    'risk': {
                        'risk_level': r.risk_level,
                        'reason': r.reason,
                        'evidence': r.evidence,
                    }
                }
                for r in risks
            ],
            'memo': review.memo,
            'approval_history': [
                {
                    'id': a.id,
                    'decision': a.decision,
                    'comment': a.comment,
                    'created_at': a.created_at,
                }
                for a in approvals
            ],
        }
    }


@app.get('/documents/review/{filename}')
def get_saved_review(filename: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    document = db.query(Document).filter(Document.stored_filename == filename).first()
    if not document:
        raise HTTPException(404, 'Document not found.')

    review = db.query(Review).filter(
        Review.document_id == document.id
    ).order_by(Review.created_at.desc()).first()

    if not review:
        raise HTTPException(404, 'No saved review found for this document.')

    risks = db.query(RiskAssessment).filter(
        RiskAssessment.review_id == review.id
    ).order_by(RiskAssessment.id).all()

    approvals = db.query(Approval).filter(
        Approval.review_id == review.id
    ).order_by(Approval.id.desc()).all()

    return serialize_saved_review(filename, document, review, risks, approvals)


@app.post('/documents/review/{filename}')
def review_contract(filename: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    document = db.query(Document).filter(Document.stored_filename == filename).first()
    if not document:
        raise HTTPException(404, 'Document not found.')

    existing_review = db.query(Review).filter(
        Review.document_id == document.id
    ).order_by(Review.created_at.desc()).first()

    if existing_review:
        risks = db.query(RiskAssessment).filter(
            RiskAssessment.review_id == existing_review.id
        ).order_by(RiskAssessment.id).all()
        approvals = db.query(Approval).filter(
            Approval.review_id == existing_review.id
        ).order_by(Approval.id.desc()).all()
        return serialize_saved_review(filename, document, existing_review, risks, approvals)

    correlation_id = str(uuid.uuid4())
    run = make_run(db, document.id, user.id, 'contract_review', 3, correlation_id)

    try:
        text = clean_text(extract_text(filename))
        record_step(
            db, run, 'extract_and_clean', 'Clause Extractor',
            'completed', {'filename': filename}
        )

        orchestrator = LegalReviewOrchestrator()
        result = orchestrator.run(text)

        record_step(
            db, run, 'extract_clauses', 'Clause Extractor',
            'completed', {'count': len(result['clauses'])}
        )
        record_step(
            db, run, 'assess_risks', 'Risk Assessor',
            'completed', {'count': len(result['risks'])}
        )
        record_step(
            db, run, 'draft_memo', 'Memo Drafter',
            'completed', {'characters': len(result['memo'])}
        )

        review = Review(
            document_id=document.id,
            status='completed',
            memo=result['memo']
        )
        db.add(review)
        db.flush()

        for risk in result['risks']:
            db.add(RiskAssessment(
                document_id=document.id,
                review_id=review.id,
                clause_title=risk['title'],
                risk_level=risk['risk']['risk_level'],
                reason=risk['risk']['reason'],
                evidence=risk['risk']['evidence']
            ))

        document.status = 'reviewed'
        run.status = 'completed'
        run.completed_steps = 3
        run.completed_at = datetime.now(timezone.utc)
        db.commit()

        return {
            'filename': filename,
            'reviewed_by': user.username,
            'run_id': run.id,
            'correlation_id': correlation_id,
            'cached': False,
            'review': {
                'risks': result['risks'],
                'memo': result['memo'],
                'approval_history': []
            }
        }

    except Exception as exc:
        db.rollback()
        run = db.get(Run, run.id)
        if run:
            run.status = 'failed'
            run.completed_at = datetime.now(timezone.utc)
            db.commit()
        raise HTTPException(500, f'Review failed: {exc}')


@app.get('/runs/{run_id}')
def get_run(run_id:str, db:Session=Depends(get_db), user:User=Depends(get_current_user)):
    run=db.get(Run,run_id)
    if not run: raise HTTPException(404,'Run not found.')
    if run.user_id != user.id and user.role != 'counsel': raise HTTPException(403,'You cannot view this run.')
    steps=db.query(RunStep).filter(RunStep.run_id==run.id).order_by(RunStep.id).all()
    return {'run':{'id':run.id,'status':run.status,'workflow':run.workflow,'correlation_id':run.correlation_id,'started_at':run.started_at,'completed_at':run.completed_at},
            'steps':[{'id':s.id,'step_name':s.step_name,'agent_name':s.agent_name,'status':s.status,'detail':s.detail,'started_at':s.started_at,'completed_at':s.completed_at} for s in steps]}

@app.get('/documents/pending-approvals')
def pending_approvals(db:Session=Depends(get_db), user:User=Depends(get_current_user)):
    docs=db.query(Document).filter(Document.status=='reviewed').all(); pending=[]
    for d in docs:
        if not db.query(Approval).filter(Approval.document_id==d.id).first():
            pending.append({'id':d.id,'filename':d.original_filename,'stored_filename':d.stored_filename,'status':d.status})
    return {'count':len(pending),'documents':pending}

@app.get('/documents/risk-issues')
def risk_issues(db:Session=Depends(get_db), user:User=Depends(get_current_user)):
    risks=db.query(RiskAssessment).all()
    return {'count':len(risks),'risks':[{'id':r.id,'document_id':r.document_id,'review_id':r.review_id,'clause_title':r.clause_title,'risk_level':r.risk_level,'reason':r.reason,'evidence':r.evidence} for r in risks]}

@app.post('/documents/approval/{filename}')
def approve_document(filename:str, request:ApprovalRequest, db:Session=Depends(get_db), user:User=Depends(require_role('counsel'))):
    if request.decision not in {'approved','rejected'}: raise HTTPException(400,'Decision must be approved or rejected.')
    document=db.query(Document).filter(Document.stored_filename==filename).first()
    if not document: raise HTTPException(404,'Document not found.')
    review=db.query(Review).filter(Review.document_id==document.id).order_by(Review.created_at.desc()).first()
    if not review: raise HTTPException(400,'No review found for this document.')
    approval=Approval(document_id=document.id,review_id=review.id,decision=request.decision,decided_by_user_id=user.id,comment=request.comment)
    db.add(approval)
    document.status = request.decision
    db.commit()
    db.refresh(approval)

    history = db.query(Approval).filter(
        Approval.review_id == review.id
    ).order_by(Approval.id.desc()).all()

    return {
        'filename': filename,
        'status': request.decision,
        'approval_id': approval.id,
        'approved_by': user.username,
        'message': f'Document {request.decision} successfully.',
        'approval_history': [
            {
                'id': a.id,
                'decision': a.decision,
                'comment': a.comment,
                'created_at': a.created_at,
            }
            for a in history
        ]
    }

@app.get('/documents/clauses/{filename}')
def get_clauses(filename:str, user:User=Depends(get_current_user)):
    return {'filename':filename,'clauses':ClauseExtractorAgent().run(clean_text(extract_text(filename)))}



@app.delete("/documents/{filename}")
def delete_document(
    filename: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Only Counsel can delete documents
    if current_user.role != "counsel":
        raise HTTPException(
            status_code=403,
            detail="Only counsel can delete documents."
        )

    document = db.query(Document).filter(
        Document.stored_filename == filename
    ).first()

    if not document:
        raise HTTPException(
            status_code=404,
            detail="Document not found."
        )

    # Delete related approvals
    db.query(Approval).filter(
        Approval.document_id == document.id
    ).delete(synchronize_session=False)

    # Delete related risks
    db.query(RiskAssessment).filter(
        RiskAssessment.document_id == document.id
    ).delete(synchronize_session=False)

    # Delete related reviews
    db.query(Review).filter(
        Review.document_id == document.id
    ).delete(synchronize_session=False)

    # Delete saved deviation results
    db.query(DeviationResult).filter(
        DeviationResult.document_id == document.id
    ).delete(synchronize_session=False)

    # Delete document record
    db.delete(document)

    db.commit()

    # Delete physical file
    file_path = os.path.join("uploads", filename)

    if os.path.exists(file_path):
        os.remove(file_path)

    return {
        "status": "success",
        "filename": filename,
        "message": "Document deleted successfully."
    }