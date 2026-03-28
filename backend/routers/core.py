from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy.orm import Session
import os
import uuid
import datetime
import io
import csv
from jose import jwt, JWTError
from passlib.context import CryptContext
from langchain_anthropic import ChatAnthropic

from database import (
    get_db, get_dynamic_schema_context, execute_agent_sql,
    Student, Course, QueryHistory
)

# --- JWT CONFIG ---
JWT_SECRET = os.environ.get("JWT_SECRET", "studentdb-dev-secret")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "480"))

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

USERS = {
    "admin": pwd_context.hash("admin123"),
}


def create_token(username: str) -> str:
    expire = datetime.datetime.now(datetime.timezone.utc) + datetime.timedelta(minutes=JWT_EXPIRE_MINUTES)
    return jwt.encode({"sub": username, "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


router = APIRouter()

# In-memory RAG store (docs are ephemeral by nature — vector DB would be next step)
uploaded_docs: dict = {}


def student_to_dict(s: Student) -> dict:
    return {
        "id": s.id, "name": s.name, "email": s.email,
        "gpa": s.gpa, "grad_year": s.grad_year,
        "department": s.department, "credits": s.credits,
    }


def course_to_dict(c: Course) -> dict:
    return {
        "id": c.id, "code": c.code, "name": c.name,
        "department": c.department, "credits": c.credits,
        "instructor": c.instructor,
    }


# ----------------------------------------------------
# AUTH ROUTES
# ----------------------------------------------------

@router.post("/auth/login")
async def login(data: dict):
    username = data.get("username", "")
    password = data.get("password", "")
    hashed = USERS.get(username)
    if not hashed or not pwd_context.verify(password, hashed):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    token = create_token(username)
    return {"token": token, "user": {"username": username, "role": "admin"}}


@router.get("/auth/me")
async def get_me(username: str = Depends(decode_token)):
    return {"username": username, "role": "admin"}


# ----------------------------------------------------
# STUDENT ROUTES
# ----------------------------------------------------

@router.get("/students/departments/list")
async def get_departments(db: Session = Depends(get_db)):
    rows = db.query(Student.department).distinct().all()
    return [r[0] for r in rows if r[0]]


@router.get("/students")
async def get_students(search: str = None, department: str = None, db: Session = Depends(get_db)):
    q = db.query(Student)
    if search:
        q = q.filter(
            Student.name.ilike(f"%{search}%") | Student.email.ilike(f"%{search}%")
        )
    if department:
        q = q.filter(Student.department == department)
    return [student_to_dict(s) for s in q.all()]


@router.post("/students", status_code=201)
async def create_student(data: dict, db: Session = Depends(get_db)):
    student = Student(id=str(uuid.uuid4()), **{k: v for k, v in data.items() if k != "id"})
    db.add(student)
    db.commit()
    db.refresh(student)
    return student_to_dict(student)


@router.put("/students/{student_id}")
async def update_student(student_id: str, data: dict, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    for k, v in data.items():
        if k != "id" and hasattr(student, k):
            setattr(student, k, v)
    db.commit()
    db.refresh(student)
    return student_to_dict(student)


@router.delete("/students/{student_id}")
async def delete_student(student_id: str, db: Session = Depends(get_db)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    db.delete(student)
    db.commit()
    return {"ok": True}


# ----------------------------------------------------
# COURSE ROUTES
# ----------------------------------------------------

@router.get("/courses")
async def get_courses(search: str = None, department: str = None, db: Session = Depends(get_db)):
    q = db.query(Course)
    if search:
        q = q.filter(
            Course.name.ilike(f"%{search}%") | Course.code.ilike(f"%{search}%")
        )
    if department:
        q = q.filter(Course.department == department)
    return [course_to_dict(c) for c in q.all()]


@router.post("/courses", status_code=201)
async def create_course(data: dict, db: Session = Depends(get_db)):
    course = Course(id=str(uuid.uuid4()), **{k: v for k, v in data.items() if k != "id"})
    db.add(course)
    db.commit()
    db.refresh(course)
    return course_to_dict(course)


@router.put("/courses/{course_id}")
async def update_course(course_id: str, data: dict, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    for k, v in data.items():
        if k != "id" and hasattr(course, k):
            setattr(course, k, v)
    db.commit()
    db.refresh(course)
    return course_to_dict(course)


@router.delete("/courses/{course_id}")
async def delete_course(course_id: str, db: Session = Depends(get_db)):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    db.delete(course)
    db.commit()
    return {"ok": True}


# ----------------------------------------------------
# REPORTS ROUTES
# ----------------------------------------------------

@router.get("/reports/analytics")
async def get_analytics(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    total = len(students)
    gpas = [s.gpa for s in students if s.gpa is not None]
    avg_gpa = sum(gpas) / len(gpas) if gpas else 0

    dept_map: dict = {}
    for s in students:
        d = s.department or "Unknown"
        dept_map.setdefault(d, []).append(s.gpa or 0)

    dept_breakdown = [
        {"name": d, "count": len(gpas_list), "avg_gpa": round(sum(gpas_list) / len(gpas_list), 2)}
        for d, gpas_list in dept_map.items()
    ]

    year_counts: dict = {}
    for s in students:
        y = str(s.grad_year or "Unknown")
        year_counts[y] = year_counts.get(y, 0) + 1
    grad_year_dist = [{"year": y, "count": c} for y, c in sorted(year_counts.items())]

    ranges = [("0-2.0", 0, 2.0), ("2.0-2.5", 2.0, 2.5), ("2.5-3.0", 2.5, 3.0), ("3.0-3.5", 3.0, 3.5), ("3.5-4.0", 3.5, 4.1)]
    gpa_dist = [
        {"range": r, "count": sum(1 for s in students if lo <= (s.gpa or 0) < hi)}
        for r, lo, hi in ranges
    ]

    return {
        "total_students": total,
        "active_students": total,
        "average_gpa": round(avg_gpa, 2),
        "total_departments": len(dept_map),
        "department_breakdown": dept_breakdown,
        "grad_year_distribution": grad_year_dist,
        "gpa_distribution": gpa_dist,
    }


@router.get("/reports/summary")
async def get_reports_summary():
    return {"status": "ok"}


@router.get("/reports/department-performance")
async def get_dept_performance(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    dept_map: dict = {}
    for s in students:
        d = s.department or "Unknown"
        dept_map.setdefault(d, []).append(s.gpa or 0)
    dept_breakdown = [
        {"name": d, "count": len(gl), "avg_gpa": round(sum(gl) / len(gl), 2)}
        for d, gl in dept_map.items()
    ]
    return {"department_breakdown": dept_breakdown}


@router.get("/reports/honor-roll")
async def get_honor_roll(db: Session = Depends(get_db)):
    honor = db.query(Student).filter(Student.gpa >= 3.5).all()
    return {"students": [student_to_dict(s) for s in honor], "count": len(honor), "threshold": 3.5}


@router.get("/reports/probation")
async def get_probation(db: Session = Depends(get_db)):
    probation = db.query(Student).filter(Student.gpa < 2.0).all()
    return {"students": [student_to_dict(s) for s in probation], "count": len(probation), "threshold": 2.0}


@router.get("/reports/export/csv")
async def export_students_csv(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["id", "name", "email", "gpa", "grad_year", "department", "credits"])
    writer.writeheader()
    writer.writerows([student_to_dict(s) for s in students])
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students.csv"}
    )


@router.get("/reports/export/pdf")
async def export_students_pdf(db: Session = Depends(get_db)):
    students = db.query(Student).all()
    content = "StudentDB Academic Report\n" + "=" * 40 + "\n\n"
    for s in students:
        content += f"{s.name} | {s.department or 'N/A'} | GPA: {s.gpa or 'N/A'} | Credits: {s.credits or 'N/A'}\n"
    return StreamingResponse(
        iter([content]),
        media_type="text/plain",
        headers={"Content-Disposition": "attachment; filename=report.txt"}
    )


# ----------------------------------------------------
# SQL AGENT ROUTES
# ----------------------------------------------------

class AgentQuery(BaseModel):
    query: str


@router.post("/agent/query")
async def run_agent_query(req: AgentQuery, db: Session = Depends(get_db)):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=400, detail="Missing ANTHROPIC_API_KEY configuration.")

    # Dynamically introspect the real DB schema
    schema_context = get_dynamic_schema_context()

    llm = ChatAnthropic(temperature=0, model="claude-3-haiku-20240307")
    prompt = (
        f"You are a SQL expert. Convert the following natural language query to valid SQL.\n"
        f"Use ONLY the tables and columns from this live database schema:\n\n{schema_context}\n\n"
        f"Natural language query: '{req.query}'\n"
        f"Rules:\n"
        f"- Return ONLY a raw SELECT SQL statement, no markdown, no explanation\n"
        f"- Use standard SQL compatible with both PostgreSQL and SQLite\n"
        f"- Do not use database-specific functions like NOW(), use generic ones\n"
        f"- Only SELECT queries are allowed\n"
    )

    response = llm.invoke(prompt)
    sql = str(response.content).replace("```sql", "").replace("```", "").strip()

    history_entry = QueryHistory(
        id=str(uuid.uuid4()),
        query=req.query,
        sql=sql,
        created_at=datetime.datetime.utcnow(),
    )

    try:
        results = execute_agent_sql(sql)
        history_entry.result_count = len(results)
        db.add(history_entry)
        db.commit()
        return {
            "sql": sql,
            "results": results,
            "message": f"Query executed successfully against the live database. {len(results)} row(s) returned.",
        }
    except ValueError as e:
        history_entry.result_count = 0
        history_entry.error = str(e)
        db.add(history_entry)
        db.commit()
        raise HTTPException(status_code=400, detail=f"SQL execution failed: {str(e)}")


@router.get("/agent/stats")
async def get_agent_stats(db: Session = Depends(get_db)):
    from sqlalchemy import inspect as sa_inspect
    from database import engine
    total = db.query(QueryHistory).count()
    tables = len(sa_inspect(engine).get_table_names())
    return {"total_queries": total, "tables": tables}


@router.get("/agent/history")
async def get_agent_history(db: Session = Depends(get_db)):
    rows = db.query(QueryHistory).order_by(QueryHistory.created_at.desc()).limit(50).all()
    return [
        {
            "id": r.id,
            "query": r.query,
            "sql": r.sql,
            "result_count": r.result_count,
            "error": r.error,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        }
        for r in rows
    ]


@router.get("/agent/schema")
async def get_agent_schema(db: Session = Depends(get_db)):
    from sqlalchemy import inspect as sa_inspect
    from database import engine
    inspector = sa_inspect(engine)
    tables = []
    for table_name in inspector.get_table_names():
        cols = inspector.get_columns(table_name)
        pk_cols = set(inspector.get_pk_constraint(table_name).get("constrained_columns", []))
        tables.append({
            "name": table_name,
            "columns": [
                {
                    "name": c["name"],
                    "type": str(c["type"]),
                    "nullable": c.get("nullable", True),
                    "pk": c["name"] in pk_cols,
                }
                for c in cols
            ],
        })
    return {"tables": tables}


# ----------------------------------------------------
# DOC INTEL / RAG ROUTES
# ----------------------------------------------------

class RagQuery(BaseModel):
    query: str


@router.post("/rag/upload")
async def upload_rag_doc(file: UploadFile = File(...)):
    content_bytes = await file.read()
    try:
        text_content = content_bytes.decode("utf-8", errors="ignore")
    except Exception:
        text_content = ""
    uploaded_docs[file.filename] = text_content[:4000]
    return {"id": file.filename, "name": file.filename, "size": f"{len(content_bytes)} bytes", "indexed": True}


@router.get("/rag/docs")
async def get_rag_docs():
    base_docs = [
        {"id": "1", "name": "CS50_Syllabus.pdf", "size": "1.4 MB"},
        {"id": "2", "name": "IIT_Research_Guidelines.docx", "size": "850 KB"},
    ]
    uploaded = [
        {"id": name, "name": name, "size": f"{len(content) // 1024 or 1} KB"}
        for name, content in uploaded_docs.items()
    ]
    return base_docs + uploaded


@router.post("/rag/query")
async def query_rag(req: RagQuery):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=400, detail="Missing ANTHROPIC_API_KEY configuration.")
    try:
        llm = ChatAnthropic(temperature=0, model="claude-3-haiku-20240307")
        doc_context = ""
        if uploaded_docs:
            doc_context = "\n\nUploaded document contents:\n"
            for name, content in uploaded_docs.items():
                if content:
                    doc_context += f"\n--- {name} ---\n{content[:2000]}\n"
        prompt = (
            f"You are a document intelligence assistant for an academic institution.\n"
            f"Answer the user's question based on the following context.\n"
            f"If no documents are uploaded, answer based on general academic knowledge.\n"
            f"{doc_context}\n"
            f"User question: '{req.query}'\n"
            f"Provide a professional 2-3 sentence analytical response."
        )
        response = llm.invoke(prompt)
        sources = list(uploaded_docs.keys()) or ["CS50_Syllabus.pdf", "IIT_Research_Guidelines.docx"]
        return {"answer": str(response.content), "sources": sources}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")
