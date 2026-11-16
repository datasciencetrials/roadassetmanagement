from fastapi import APIRouter
from pydantic import BaseModel
from routes.search import semantic_search
import time

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

@router.post("/chat")
def chat_with_agent(req: ChatRequest):
    try:
        # Step 1: Perform RAG semantic search to get context
        search_results = semantic_search(q=req.message, top_k=3)
        matches = search_results.get("results", [])
        
        # Step 2: Build Context String
        if not matches:
            return {"reply": "I couldn't find any relevant information in the Uganda Road Manuals database."}
        
        context_snippets = []
        sources = set()
        for idx, m in enumerate(matches):
            context_snippets.append(f"Source {idx+1}: {m['snippet']}")
            sources.add(m['document'])
            
        context_str = "\n\n".join(context_snippets)
        
        # Step 3: Simulated LLM Generation 
        # (In a real deployment with an API key, you would call OpenAI/Anthropic here with the context_str)
        time.sleep(1.5) # Simulate processing time
        
        reply = (
            f"Based on the **{len(sources)}** manuals I found in the database, here is the information regarding your query:\n\n"
            f"{context_str}\n\n"
            f"*Disclaimer: This is an AI-generated summary from the semantic vector search. To upgrade to a full LLM, provide an API key in the backend.*"
        )
        
        return {"reply": reply}
    except Exception as e:
        return {"error": str(e)}
