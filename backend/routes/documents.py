from fastapi import APIRouter, HTTPException
import sqlite3
import os

router = APIRouter()

def get_db_path():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "..", "extraction_engine", "output", "manuals_data.sqlite")

@router.get("/documents/{doc_name}/page/{page_number}")
def get_document_page(doc_name: str, page_number: int):
    db_path = get_db_path()
    if not os.path.exists(db_path):
        raise HTTPException(status_code=500, detail="Database not found.")
        
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT text_content FROM pages WHERE doc_name=? AND page_number=?", 
        (doc_name, page_number)
    )
    result = cursor.fetchone()
    conn.close()
    
    if result:
        return {"document": doc_name, "page": page_number, "text": result[0]}
    
    raise HTTPException(status_code=404, detail="Page not found.")

@router.get("/documents/{doc_name}/images")
def get_document_images(doc_name: str, page_number: int = None):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    if page_number:
        cursor.execute(
            "SELECT page_number, image_index, image_path FROM images WHERE doc_name=? AND page_number=?", 
            (doc_name, page_number)
        )
    else:
        cursor.execute(
            "SELECT page_number, image_index, image_path FROM images WHERE doc_name=?", 
            (doc_name,)
        )
        
    results = cursor.fetchall()
    conn.close()
    
    images = [{"page": row[0], "index": row[1], "path": row[2]} for row in results]
    return {"document": doc_name, "images": images}

@router.get("/documents/{doc_name}/tables")
def get_document_tables(doc_name: str):
    db_path = get_db_path()
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    cursor.execute(
        "SELECT page_number, table_index, csv_path FROM tables WHERE doc_name=?", 
        (doc_name,)
    )
        
    results = cursor.fetchall()
    conn.close()
    
    tables = [{"page": row[0], "index": row[1], "csv_path": row[2]} for row in results]
    return {"document": doc_name, "tables": tables}
