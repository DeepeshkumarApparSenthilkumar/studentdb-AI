from fastapi import APIRouter, File, UploadFile, HTTPException
from pydantic import BaseModel
import pandas as pd
import uuid
import os
import json
from langchain_anthropic import ChatAnthropic

router = APIRouter()

# --- MOCK PERSISTENCE ---
# This dictionary acts as an active session holder mapping connection_id -> dataset
active_connections = {}

# Make sure we have a temp upload directory
UPLOAD_DIR = os.path.join(os.getcwd(), "temp_uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class ConnectRequest(BaseModel):
    type: str
    host: str = None
    username: str = None
    password: str = None

class QueryRequest(BaseModel):
    query: str
    connection_id: str

@router.post("/datastudio/connect")
async def connect_external_db(data: ConnectRequest):
    """Handles credentials for SQL Server / Databricks connections"""
    conn_id = str(uuid.uuid4())
    active_connections[conn_id] = {
        "type": data.type,
        "details": data.dict()
    }
    return {"connection_id": conn_id, "message": f"Successfully connected to {data.type}"}

@router.post("/datastudio/upload")
async def upload_external_file(file: UploadFile = File(...)):
    """Handles parsing and uploading of flat files like CSV or Excel"""
    try:
        conn_id = str(uuid.uuid4())
        file_path = os.path.join(UPLOAD_DIR, f"{conn_id}_{file.filename}")
        
        with open(file_path, "wb") as f:
            f.write(await file.read())

        # Parse into DataFrame based on extension
        if file.filename.endswith('.csv'):
            df = pd.read_csv(file_path)
        elif file.filename.endswith(('.xls', '.xlsx')):
            df = pd.read_excel(file_path)
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format")

        # Save to session memory
        active_connections[conn_id] = {
            "type": "excel",
            "file_path": file_path,
            "df": df
        }
        return {"connection_id": conn_id, "message": "File successfully parsed and uploaded."}

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to process file: {str(e)}")

@router.post("/datastudio/query")
async def query_external_data(request: QueryRequest):
    """The brain that routes natural language queries to an LLM over the connected data"""
    conn_id = request.connection_id
    user_query = request.query
    
    if conn_id not in active_connections:
        raise HTTPException(status_code=404, detail="Connection expired or not found. Please reconnect.")
        
    session = active_connections[conn_id]
    
    try:
        # If the data type is Excel/CSV, run a Pandas Agent
        if session["type"] == "excel":
            df = session["df"]
            
            # --- ANTHROPIC INTELLIGENCE ---
            # If the user has NOT provided an ANTHROPIC_API_KEY globally, we just mock the result
            if not os.environ.get("ANTHROPIC_API_KEY"):
                sample_data = json.loads(df.head(5).to_json(orient="records", date_format="iso"))
                return {
                    "sql": "# Warning: No ANTHROPIC_API_KEY detected. Returning first rows as mock.\ndf.head()",
                    "results": sample_data,
                    "message": "NOTE: You need to set an ANTHROPIC_API_KEY in the backend to use the generative agent. For now, showing raw top rows of your data."
                }
                
            # Use Claude directly to analyze the dataframe
            llm = ChatAnthropic(temperature=0, model="claude-3-haiku-20240307")

            df_info = {
                "columns": list(df.columns),
                "row_count": len(df),
                "sample": json.loads(df.head(5).to_json(orient="records", date_format="iso")),
                "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
            }
            prompt = (
                f"You are a data analyst. The user has uploaded a dataset with {df_info['row_count']} rows.\n"
                f"Columns: {df_info['columns']}\n"
                f"Column types: {df_info['dtypes']}\n"
                f"Sample data (first 5 rows): {json.dumps(df_info['sample'], indent=2)}\n\n"
                f"User query: '{user_query}'\n\n"
                f"Answer the user's question about this dataset in 2-3 sentences. Be specific and analytical."
            )
            response = llm.invoke(prompt)
            answer = str(response.content)

            sample_data = json.loads(df.head(10).to_json(orient="records", date_format="iso"))

            return {
                "sql": f"# Analyzing {df_info['row_count']} rows x {len(df_info['columns'])} columns\n# Columns: {', '.join(df_info['columns'])}",
                "results": sample_data,
                "message": answer
            }
            
        # If the data type is Database (SQL, Databricks)
        else:
            # Here you would typically use LangChain's SQL Agent (create_sql_agent) over a SQLAlchemy connection
            # For brevity of this scaffold, we mock it.
            return {
                "sql": f"-- Simulating execution on {session['type'].upper()} database\nSELECT * FROM custom_data LIMIT 10;",
                "results": [{"metric": "Example", "value": 123}],
                "message": f"Successfully simulated a query to your {session['type']} cluster. You can plug in a real SQLAlchemy Engine here!"
            }
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate query: {str(e)}")
