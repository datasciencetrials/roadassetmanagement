from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes import search, documents, charts, aris, chat
import uvicorn

app = FastAPI(title="Uganda Road Asset Management AI Backend", version="1.0.0")

# Configure CORS for GitHub Pages frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "https://networkengineringmowt-ai.github.io"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include API Routers
app.include_router(search.router, prefix="/api")
app.include_router(documents.router, prefix="/api")
app.include_router(charts.router, prefix="/api")
app.include_router(aris.router, prefix="/api")
app.include_router(chat.router, prefix="/api")

@app.get("/")
def read_root():
    return {"message": "Welcome to the Uganda Road Asset Management AI Backend Engine."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
