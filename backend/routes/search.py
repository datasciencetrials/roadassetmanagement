from fastapi import APIRouter, Query
from pydantic import BaseModel
import chromadb
import os

router = APIRouter()

def get_chroma_client():
    # Adjusted path to reach back out to the extraction_engine output directory
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(base_dir, "..", "extraction_engine", "output", "chroma_db")
    return chromadb.PersistentClient(path=output_dir)

@router.get("/search")
def semantic_search(q: str = Query(..., min_length=3), top_k: int = 5):
    try:
        client = get_chroma_client()
        collection = client.get_or_create_collection(name="manuals_text")
        
        results = collection.query(
            query_texts=[q],
            n_results=top_k
        )
        
        matches = []
        if results['documents'] and results['documents'][0]:
            for i in range(len(results['documents'][0])):
                doc_text = results['documents'][0][i]
                metadata = results['metadatas'][0][i]
                distance = results['distances'][0][i] if 'distances' in results and results['distances'] else None
                
                doc_name = metadata.get('doc_name', 'Unknown Document')
                page_num = metadata.get('page_number', 'Unknown Page')
                
                # Truncate string for snippet
                snippet = doc_text[:400] + "..." if len(doc_text) > 400 else doc_text
                
                matches.append({
                    "document": doc_name,
                    "page": page_num,
                    "snippet": snippet,
                    "distance": distance
                })
                
        return {"query": q, "results": matches}
        
    except Exception as e:
        return {"error": str(e)}
