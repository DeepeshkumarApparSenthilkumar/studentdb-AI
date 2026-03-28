import os
import uuid
from sqlalchemy import create_engine, Column, String, Float, Integer, Text, DateTime, inspect as sa_inspect, text
from sqlalchemy.orm import declarative_base, sessionmaker
import datetime

DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///./studentdb.db")

# Railway / older Heroku use postgres:// — SQLAlchemy needs postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ----------------------------------------------------
# MODELS
# ----------------------------------------------------

class Student(Base):
    __tablename__ = "students"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False)
    gpa = Column(Float, nullable=True)
    grad_year = Column(Integer, nullable=True)
    department = Column(String(100), nullable=True)
    credits = Column(Integer, nullable=True)


class Course(Base):
    __tablename__ = "courses"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    code = Column(String(20), nullable=False)
    name = Column(String(255), nullable=False)
    department = Column(String(100), nullable=True)
    credits = Column(Integer, nullable=True)
    instructor = Column(String(255), nullable=True)


class Department(Base):
    __tablename__ = "departments"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(100), nullable=False)
    head = Column(String(255), nullable=True)
    building = Column(String(100), nullable=True)


class QueryHistory(Base):
    __tablename__ = "query_history"
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    query = Column(Text, nullable=False)
    sql = Column(Text, nullable=True)
    result_count = Column(Integer, default=0)
    error = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)


# ----------------------------------------------------
# SEED DATA
# ----------------------------------------------------

SEED_STUDENTS = [
    {"name": "Sarah Connor",    "email": "sarah@iit.edu",   "gpa": 3.9, "grad_year": 2025, "department": "Computer Science", "credits": 85},
    {"name": "John Smith",      "email": "john@iit.edu",    "gpa": 3.4, "grad_year": 2024, "department": "Engineering",      "credits": 40},
    {"name": "Emily Chen",      "email": "emily@iit.edu",   "gpa": 3.8, "grad_year": 2026, "department": "Mathematics",      "credits": 110},
    {"name": "Marcus Johnson",  "email": "marcus@iit.edu",  "gpa": 2.8, "grad_year": 2025, "department": "Physics",          "credits": 65},
    {"name": "Priya Patel",     "email": "priya@iit.edu",   "gpa": 3.6, "grad_year": 2024, "department": "Computer Science", "credits": 95},
    {"name": "David Lee",       "email": "david@iit.edu",   "gpa": 1.8, "grad_year": 2026, "department": "Engineering",      "credits": 30},
    {"name": "Sofia Torres",    "email": "sofia@iit.edu",   "gpa": 3.95,"grad_year": 2025, "department": "Mathematics",      "credits": 120},
    {"name": "Ahmed Hassan",    "email": "ahmed@iit.edu",   "gpa": 3.2, "grad_year": 2024, "department": "Computer Science", "credits": 75},
    {"name": "Rachel Kim",      "email": "rachel@iit.edu",  "gpa": 2.5, "grad_year": 2026, "department": "Physics",          "credits": 50},
    {"name": "Tyler Brooks",    "email": "tyler@iit.edu",   "gpa": 3.7, "grad_year": 2025, "department": "Engineering",      "credits": 90},
]

SEED_COURSES = [
    {"code": "CS101",   "name": "Introduction to Programming",  "department": "Computer Science", "credits": 3, "instructor": "Prof. Williams"},
    {"code": "MATH201", "name": "Calculus II",                  "department": "Mathematics",      "credits": 4, "instructor": "Prof. Nguyen"},
    {"code": "ENG301",  "name": "Circuits and Systems",         "department": "Engineering",      "credits": 3, "instructor": "Prof. Davis"},
    {"code": "CS301",   "name": "Data Structures",              "department": "Computer Science", "credits": 3, "instructor": "Prof. Kim"},
    {"code": "PHY101",  "name": "Classical Mechanics",          "department": "Physics",          "credits": 4, "instructor": "Prof. Brown"},
    {"code": "CS401",   "name": "Machine Learning",             "department": "Computer Science", "credits": 3, "instructor": "Prof. Zhang"},
    {"code": "MATH301", "name": "Linear Algebra",               "department": "Mathematics",      "credits": 3, "instructor": "Prof. Nguyen"},
    {"code": "ENG201",  "name": "Thermodynamics",               "department": "Engineering",      "credits": 4, "instructor": "Prof. Davis"},
]

SEED_DEPARTMENTS = [
    {"name": "Computer Science", "head": "Prof. Williams", "building": "Stuart Building"},
    {"name": "Mathematics",      "head": "Prof. Nguyen",   "building": "Science Hall"},
    {"name": "Engineering",      "head": "Prof. Davis",    "building": "Galvin Library"},
    {"name": "Physics",          "head": "Prof. Brown",    "building": "Life Sciences"},
]


# ----------------------------------------------------
# INIT + SEED
# ----------------------------------------------------

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(Student).count() == 0:
            for s in SEED_STUDENTS:
                db.add(Student(id=str(uuid.uuid4()), **s))
        if db.query(Course).count() == 0:
            for c in SEED_COURSES:
                db.add(Course(id=str(uuid.uuid4()), **c))
        if db.query(Department).count() == 0:
            for d in SEED_DEPARTMENTS:
                db.add(Department(id=str(uuid.uuid4()), **d))
        db.commit()
    finally:
        db.close()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ----------------------------------------------------
# DYNAMIC SCHEMA INTROSPECTION (for AI Agent)
# ----------------------------------------------------

def get_dynamic_schema_context() -> str:
    """Introspect the live database and return schema as a string for the AI prompt."""
    inspector = sa_inspect(engine)
    parts = []
    for table_name in inspector.get_table_names():
        cols = inspector.get_columns(table_name)
        pk_cols = set(inspector.get_pk_constraint(table_name).get("constrained_columns", []))
        col_strs = []
        for c in cols:
            pk = " PK" if c["name"] in pk_cols else ""
            nullable = "" if c.get("nullable", True) else " NOT NULL"
            col_strs.append(f"{c['name']} {c['type']}{pk}{nullable}")
        parts.append(f"- {table_name}({', '.join(col_strs)})")
    return "Tables:\n" + "\n".join(parts)


def execute_agent_sql(sql: str) -> list:
    """Execute a read-only SELECT query against the real database."""
    stripped = sql.strip()
    if not stripped.upper().startswith("SELECT"):
        raise ValueError("Only SELECT queries are permitted.")
    with engine.connect() as conn:
        result = conn.execute(text(stripped))
        columns = list(result.keys())
        rows = result.fetchmany(200)
        return [dict(zip(columns, row)) for row in rows]
