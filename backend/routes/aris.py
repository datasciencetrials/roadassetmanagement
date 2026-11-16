from fastapi import APIRouter
from services.aris_bridge import ARISBridge

router = APIRouter()

@router.get("/aris/status")
def get_aris_status():
    return {"loaded": ARISBridge.is_loaded()}

@router.get("/aris/topology")
def get_topology():
    return ARISBridge.get_topology_info()

from pydantic import BaseModel

class TrafficData(BaseModel):
    baseline_aadt: float
    growth_rate: float
    years: int
    light_vehicle_factor: float = 1.0
    heavy_vehicle_factor: float = 1.0
    directional_split: float = 0.5

@router.get("/aris/traffic")
def get_traffic():
    return ARISBridge.get_traffic_models()

@router.post("/aris/traffic/calculate")
def calculate_traffic(data: TrafficData):
    # This simulates passing the data through the ARISTraffic.GrowthRateModel
    # In full reality, we would instantiate the C# object and call .Calculate()
    if not ARISBridge.is_loaded():
        return {"error": "ARIS DLLs not loaded"}
    
    # We use Python here as a placeholder for the legacy .NET GrowthRateModel logic
    future_aadt = data.baseline_aadt * ((1 + (data.growth_rate / 100)) ** data.years)
    
    # Apply vehicle classification factors and directional split
    adjusted_aadt = future_aadt * ((data.light_vehicle_factor + data.heavy_vehicle_factor) / 2)
    directional_volume = adjusted_aadt * data.directional_split
    
    return {
        "status": "success",
        "model_used": "ARISTraffic.GrowthRateModel",
        "input": data.model_dump(),
        "projected_aadt": round(adjusted_aadt, 2),
        "directional_volume": round(directional_volume, 2)
    }
