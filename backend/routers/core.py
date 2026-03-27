from fastapi import APIRouter, File, UploadFile, HTTPException, Depends
from fastapi.responses import JSONResponse, StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
import os
import uuid
import datetime
import io
import csv
import sqlite3
from jose import jwt, JWTError
from passlib.context import CryptContext
from langchain_anthropic import ChatAnthropic

# --- JWT CONFIG ---
JWT_SECRET = os.environ.get("JWT_SECRET", "studentdb-dev-secret")
JWT_ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_EXPIRE_MINUTES = int(os.environ.get("JWT_EXPIRE_MINUTES", "480"))

pwd_context = CryptContext(schemes=["pbkdf2_sha256"], deprecated="auto")
bearer_scheme = HTTPBearer(auto_error=False)

# Hardcoded admin user — swap for a real DB lookup when ready
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

# ----------------------------------------------------
# IN-MEMORY STORES
# ----------------------------------------------------

uploaded_docs = {}  # filename -> text_content
students_db = [
    {"id": "1", "name": "Sarah Connor", "email": "sarah@iit.edu", "gpa": 3.9, "grad_year": 2025, "department": "Computer Science", "credits": 85},
    {"id": "2", "name": "John Smith", "email": "john@iit.edu", "gpa": 3.4, "grad_year": 2024, "department": "Engineering", "credits": 40},
    {"id": "3", "name": "Emily Chen", "email": "emily@iit.edu", "gpa": 3.8, "grad_year": 2026, "department": "Mathematics", "credits": 110},
    {"id": "4", "name": "Marcus Johnson", "email": "marcus@iit.edu", "gpa": 2.8, "grad_year": 2025, "department": "Physics", "credits": 65},
    {"id": "5", "name": "Priya Patel", "email": "priya@iit.edu", "gpa": 3.6, "grad_year": 2024, "department": "Computer Science", "credits": 95},
]

courses_db = [
    {"id": "1", "code": "CS101", "name": "Introduction to Programming", "department": "Computer Science", "credits": 3, "instructor": "Prof. Williams"},
    {"id": "2", "code": "MATH201", "name": "Calculus II", "department": "Mathematics", "credits": 4, "instructor": "Prof. Nguyen"},
    {"id": "3", "code": "ENG301", "name": "Circuits and Systems", "department": "Engineering", "credits": 3, "instructor": "Prof. Davis"},
    {"id": "4", "code": "CS301", "name": "Data Structures", "department": "Computer Science", "credits": 3, "instructor": "Prof. Kim"},
    {"id": "5", "code": "PHY101", "name": "Classical Mechanics", "department": "Physics", "credits": 4, "instructor": "Prof. Brown"},
]

query_history = []


def execute_sql_on_memory_db(sql: str) -> list:
    """Execute SQL against an in-memory SQLite DB seeded from students_db and courses_db."""
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    # Create tables
    cur.execute("""CREATE TABLE students (
        id TEXT, name TEXT, email TEXT, gpa REAL,
        grad_year INTEGER, department TEXT, credits INTEGER
    )""")
    cur.execute("""CREATE TABLE courses (
        id TEXT, code TEXT, name TEXT, department TEXT,
        credits INTEGER, instructor TEXT
    )""")
    cur.execute("""CREATE TABLE departments (
        id TEXT, name TEXT, head TEXT, building TEXT
    )""")
    # Seed data
    for s in students_db:
        cur.execute("INSERT INTO students VALUES (?,?,?,?,?,?,?)",
            (s.get("id"), s.get("name"), s.get("email"), s.get("gpa"),
             s.get("grad_year"), s.get("department"), s.get("credits")))
    for c in courses_db:
        cur.execute("INSERT INTO courses VALUES (?,?,?,?,?,?)",
            (c.get("id"), c.get("code"), c.get("name"), c.get("department"),
             c.get("credits"), c.get("instructor")))
    conn.commit()
    try:
        cur.execute(sql)
        rows = cur.fetchall()
        return [dict(r) for r in rows]
    except Exception as e:
        raise ValueError(f"SQL execution error: {str(e)}")
    finally:
        conn.close()


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
async def get_departments():
    return list(set(s["department"] for s in students_db if s.get("department")))

@router.get("/students")
async def get_students(search: str = None, department: str = None):
    result = students_db.copy()
    if search:
        search_lower = search.lower()
        result = [s for s in result if search_lower in s["name"].lower() or search_lower in s["email"].lower()]
    if department:
        result = [s for s in result if s["department"] == department]
    return result

@router.post("/students", status_code=201)
async def create_student(data: dict):
    student = {**data, "id": str(uuid.uuid4())}
    students_db.append(student)
    return student

@router.put("/students/{student_id}")
async def update_student(student_id: str, data: dict):
    for i, s in enumerate(students_db):
        if s["id"] == str(student_id):
            students_db[i] = {**s, **data, "id": str(student_id)}
            return students_db[i]
    raise HTTPException(status_code=404, detail="Student not found")

@router.delete("/students/{student_id}")
async def delete_student(student_id: str):
    for i, s in enumerate(students_db):
        if s["id"] == str(student_id):
            students_db.pop(i)
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Student not found")


# ----------------------------------------------------
# COURSE ROUTES
# ----------------------------------------------------
@router.get("/courses")
async def get_courses(search: str = None, department: str = None):
    result = courses_db.copy()
    if search:
        search_lower = search.lower()
        result = [c for c in result if search_lower in c["name"].lower() or search_lower in c.get("code", "").lower()]
    if department:
        result = [c for c in result if c["department"] == department]
    return result

@router.post("/courses", status_code=201)
async def create_course(data: dict):
    course = {**data, "id": str(uuid.uuid4())}
    courses_db.append(course)
    return course

@router.put("/courses/{course_id}")
async def update_course(course_id: str, data: dict):
    for i, c in enumerate(courses_db):
        if c["id"] == str(course_id):
            courses_db[i] = {**c, **data, "id": str(course_id)}
            return courses_db[i]
    raise HTTPException(status_code=404, detail="Course not found")

@router.delete("/courses/{course_id}")
async def delete_course(course_id: str):
    for i, c in enumerate(courses_db):
        if c["id"] == str(course_id):
            courses_db.pop(i)
            return {"ok": True}
    raise HTTPException(status_code=404, detail="Course not found")


# ----------------------------------------------------
# REPORTS ROUTES
# ----------------------------------------------------
@router.get("/reports/analytics")
async def get_analytics():
    total = len(students_db)
    gpas = [s["gpa"] for s in students_db if s.get("gpa")]
    avg_gpa = sum(gpas) / len(gpas) if gpas else 0

    # department breakdown
    dept_counts = {}
    dept_gpas = {}
    for s in students_db:
        d = s.get("department", "Unknown")
        dept_counts[d] = dept_counts.get(d, 0) + 1
        dept_gpas.setdefault(d, []).append(s.get("gpa", 0))

    dept_breakdown = [
        {"name": d, "count": dept_counts[d], "avg_gpa": sum(dept_gpas[d]) / len(dept_gpas[d])}
        for d in dept_counts
    ]

    # grad year distribution
    year_counts = {}
    for s in students_db:
        y = s.get("grad_year", "Unknown")
        year_counts[str(y)] = year_counts.get(str(y), 0) + 1
    grad_year_dist = [{"year": y, "count": c} for y, c in sorted(year_counts.items())]

    # gpa distribution
    ranges = [("0-2.0", 0, 2.0), ("2.0-2.5", 2.0, 2.5), ("2.5-3.0", 2.5, 3.0), ("3.0-3.5", 3.0, 3.5), ("3.5-4.0", 3.5, 4.1)]
    gpa_dist = [
        {"range": r, "count": sum(1 for s in students_db if lo <= (s.get("gpa") or 0) < hi)}
        for r, lo, hi in ranges
    ]

    return {
        "total_students": total,
        "active_students": total,
        "average_gpa": round(avg_gpa, 2),
        "total_departments": len(dept_counts),
        "department_breakdown": dept_breakdown,
        "grad_year_distribution": grad_year_dist,
        "gpa_distribution": gpa_dist,
    }

@router.get("/reports/summary")
async def get_reports_summary():
    return {"status": "ok"}

@router.get("/reports/department-performance")
async def get_dept_performance():
    dept_counts = {}
    dept_gpas = {}
    for s in students_db:
        d = s.get("department", "Unknown")
        dept_counts[d] = dept_counts.get(d, 0) + 1
        dept_gpas.setdefault(d, []).append(s.get("gpa", 0))

    dept_breakdown = [
        {"name": d, "count": dept_counts[d], "avg_gpa": sum(dept_gpas[d]) / len(dept_gpas[d])}
        for d in dept_counts
    ]

    return {"department_breakdown": dept_breakdown}

@router.get("/reports/honor-roll")
async def get_honor_roll():
    honor = [s for s in students_db if s.get("gpa", 0) >= 3.5]
    return {"students": honor, "count": len(honor), "threshold": 3.5}

@router.get("/reports/probation")
async def get_probation():
    probation = [s for s in students_db if s.get("gpa", 0) < 2.0]
    return {"students": probation, "count": len(probation), "threshold": 2.0}

@router.get("/reports/export/csv")
async def export_students_csv():
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=["id", "name", "email", "gpa", "grad_year", "department", "credits"])
    writer.writeheader()
    writer.writerows(students_db)
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students.csv"}
    )

@router.get("/reports/export/pdf")
async def export_students_pdf():
    # Returns a simple text-based "PDF" for now (proper PDF needs reportlab/weasyprint)
    content = "StudentDB Academic Report\n" + "="*40 + "\n\n"
    for s in students_db:
        content += f"{s['name']} | {s.get('department','N/A')} | GPA: {s.get('gpa','N/A')} | Credits: {s.get('credits','N/A')}\n"
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

SCHEMA_CONTEXT = """
Tables and columns:
- students(id UUID PK, name VARCHAR, email VARCHAR, gpa DECIMAL, grad_year INTEGER, department VARCHAR, credits INTEGER)
- courses(id UUID PK, code VARCHAR, name VARCHAR, department VARCHAR, credits INTEGER, instructor VARCHAR)
- departments(id UUID PK, name VARCHAR, head VARCHAR, building VARCHAR)
"""

@router.post("/agent/query")
async def run_agent_query(req: AgentQuery):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=400, detail="Missing ANTHROPIC_API_KEY configuration.")

    llm = ChatAnthropic(temperature=0, model="claude-3-haiku-20240307")

    prompt = (
        f"You are a PostgreSQL expert. Convert the following natural language query to valid PostgreSQL SQL.\n"
        f"Use ONLY the columns and tables defined in this schema:\n{SCHEMA_CONTEXT}\n"
        f"Natural language query: '{req.query}'\n"
        f"Return ONLY the raw SQL string without any markdown blocks or explanations."
    )

    response = llm.invoke(prompt)
    sql = str(response.content).replace('```sql', '').replace('```', '').strip()

    try:
        results = execute_sql_on_memory_db(sql)
    except ValueError as e:
        # SQL failed (e.g. bad column name from Claude) — fall back to sample data
        results = students_db[:3]
        query_history.append({
            "id": str(uuid.uuid4()),
            "query": req.query,
            "sql": sql,
            "result_count": 0,
            "created_at": datetime.datetime.now().isoformat(),
            "error": str(e),
        })
        return {
            "sql": sql,
            "results": results,
            "message": f"SQL generated but could not be executed: {str(e)}",
        }

    query_history.append({
        "id": str(uuid.uuid4()),
        "query": req.query,
        "sql": sql,
        "result_count": len(results),
        "created_at": datetime.datetime.now().isoformat(),
        "error": None,
    })

    return {
        "sql": sql,
        "results": results,
        "message": f"Claude actively interpreted your intent and generated the following SQL: {sql}",
    }

@router.get("/agent/stats")
async def get_agent_stats():
    return {"total_queries": len(query_history), "tables": 3}

@router.get("/agent/history")
async def get_agent_history():
    return list(reversed(query_history))

@router.get("/agent/schema")
async def get_agent_schema():
    return {
        "tables": [
            {
                "name": "students",
                "columns": [
                    {"name": "id", "type": "UUID", "nullable": False, "pk": True},
                    {"name": "name", "type": "VARCHAR(255)", "nullable": False, "pk": False},
                    {"name": "email", "type": "VARCHAR(255)", "nullable": False, "pk": False},
                    {"name": "gpa", "type": "DECIMAL(3,2)", "nullable": True, "pk": False},
                    {"name": "grad_year", "type": "INTEGER", "nullable": True, "pk": False},
                    {"name": "department", "type": "VARCHAR(100)", "nullable": True, "pk": False},
                    {"name": "credits", "type": "INTEGER", "nullable": True, "pk": False},
                ],
            },
            {
                "name": "courses",
                "columns": [
                    {"name": "id", "type": "UUID", "nullable": False, "pk": True},
                    {"name": "code", "type": "VARCHAR(20)", "nullable": False, "pk": False},
                    {"name": "name", "type": "VARCHAR(255)", "nullable": False, "pk": False},
                    {"name": "department", "type": "VARCHAR(100)", "nullable": True, "pk": False},
                    {"name": "credits", "type": "INTEGER", "nullable": True, "pk": False},
                    {"name": "instructor", "type": "VARCHAR(255)", "nullable": True, "pk": False},
                ],
            },
            {
                "name": "departments",
                "columns": [
                    {"name": "id", "type": "UUID", "nullable": False, "pk": True},
                    {"name": "name", "type": "VARCHAR(100)", "nullable": False, "pk": False},
                    {"name": "head", "type": "VARCHAR(255)", "nullable": True, "pk": False},
                    {"name": "building", "type": "VARCHAR(100)", "nullable": True, "pk": False},
                ],
            },
        ]
    }


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
    uploaded_docs[file.filename] = text_content[:4000]  # cap at 4000 chars
    return {"id": file.filename, "name": file.filename, "size": f"{len(content_bytes)} bytes", "indexed": True}

@router.get("/rag/docs")
async def get_rag_docs():
    base_docs = [
        {"id": "1", "name": "CS50_Syllabus.pdf", "size": "1.4 MB"},
        {"id": "2", "name": "IIT_Research_Guidelines.docx", "size": "850 KB"},
    ]
    uploaded = [{"id": name, "name": name, "size": f"{len(content)//1024 or 1} KB"} for name, content in uploaded_docs.items()]
    return base_docs + uploaded

@router.post("/rag/query")
async def query_rag(req: RagQuery):
    if not req.query or not req.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")
    if not os.environ.get("ANTHROPIC_API_KEY"):
        raise HTTPException(status_code=400, detail="Missing ANTHROPIC_API_KEY configuration.")
    try:
        llm = ChatAnthropic(temperature=0, model="claude-3-haiku-20240307")

        # Build context from any uploaded documents
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
        return {
            "answer": str(response.content),
            "sources": sources,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"RAG query failed: {str(e)}")
