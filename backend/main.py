import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
from routers import datastudio, core
from dotenv import load_dotenv

# Load variables from .env file into os.environ
load_dotenv()

app = FastAPI(title="StudentDB Backend API")

# Configure CORS so the React frontend can talk to it seamlessly
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Connect the DataStudio router we are creating
app.include_router(datastudio.router, prefix="/api")

# Connect the Core StudentDB API (Agents, RAG, Dashboard) using Anthropic
app.include_router(core.router, prefix="/api")

@app.get("/api/health")
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
