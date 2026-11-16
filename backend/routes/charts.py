from fastapi import APIRouter
from fastapi.responses import FileResponse
import os
import glob

router = APIRouter()

def get_charts_dir():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "..", "extraction_engine", "output", "generated_charts")

@router.get("/charts")
def list_charts():
    charts_dir = get_charts_dir()
    if not os.path.exists(charts_dir):
        return {"charts": []}
        
    chart_files = glob.glob(os.path.join(charts_dir, "*.png"))
    chart_names = [os.path.basename(f) for f in chart_files]
    
    # We return the list of names, which the frontend can use to fetch the images
    return {"charts": chart_names}

@router.get("/charts/{chart_name}")
def get_chart_image(chart_name: str):
    charts_dir = get_charts_dir()
    chart_path = os.path.join(charts_dir, chart_name)
    
    if os.path.exists(chart_path) and chart_path.endswith('.png'):
        return FileResponse(chart_path, media_type="image/png")
        
    return {"error": "Chart not found"}
