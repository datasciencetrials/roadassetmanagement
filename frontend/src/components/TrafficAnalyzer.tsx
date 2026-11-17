import React, { useState } from 'react';
import axios from 'axios';
import { Activity, TrendingUp, } from 'lucide-react';

const TrafficAnalyzer: React.FC = () => {
  const [baselineAadt, setBaselineAadt] = useState<number>(5000);
  const [growthRate, setGrowthRate] = useState<number>(3.5);
  const [years, setYears] = useState<number>(10);
  const [lightFactor, setLightFactor] = useState<number>(1.2);
  const [heavyFactor, setHeavyFactor] = useState<number>(0.8);
  const [dirSplit, setDirSplit] = useState<number>(0.5);
  
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const calculateTraffic = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const response = await axios.post('http://localhost:8000/api/aris/traffic/calculate', {
        baseline_aadt: baselineAadt,
        growth_rate: growthRate,
        years: years,
        light_vehicle_factor: lightFactor,
        heavy_vehicle_factor: heavyFactor,
        directional_split: dirSplit
      });
      setResult(response.data);
    } catch (err) {
      console.error(err);
      alert("Failed to calculate traffic from ARIS.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="traffic-analyzer glass-panel">
      <div className="analyzer-header">
        <Activity size={24} color="#f472b6" />
        <h2>ARIS Traffic Analyzer</h2>
        <span className="badge traffic-badge" style={{marginLeft: 'auto'}}>ARISTraffic.dll</span>
      </div>
      
      <div className="analyzer-content">
        <form onSubmit={calculateTraffic} className="traffic-form" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem'}}>
          <div className="form-group">
            <label>Baseline AADT</label>
            <input type="number" value={baselineAadt} onChange={(e) => setBaselineAadt(Number(e.target.value))} required />
          </div>
          <div className="form-group">
            <label>Growth Rate (%)</label>
            <input type="number" step="0.1" value={growthRate} onChange={(e) => setGrowthRate(Number(e.target.value))} required />
          </div>
          <div className="form-group">
            <label>Years</label>
            <input type="number" value={years} onChange={(e) => setYears(Number(e.target.value))} required />
          </div>
          <div className="form-group">
            <label>Light Veh Factor</label>
            <input type="number" step="0.1" value={lightFactor} onChange={(e) => setLightFactor(Number(e.target.value))} required />
          </div>
          <div className="form-group">
            <label>Heavy Veh Factor</label>
            <input type="number" step="0.1" value={heavyFactor} onChange={(e) => setHeavyFactor(Number(e.target.value))} required />
          </div>
          <div className="form-group">
            <label>Directional Split (0-1)</label>
            <input type="number" step="0.1" max="1" min="0" value={dirSplit} onChange={(e) => setDirSplit(Number(e.target.value))} required />
          </div>
          <button type="submit" className="calc-button" disabled={loading} style={{gridColumn: '1 / -1'}}>
            {loading ? 'Calculating...' : 'Run ARIS Model'}
          </button>
        </form>

        {result && (
          <div className="traffic-result">
            <div className="result-icon">
              <TrendingUp size={32} color="#10b981" />
            </div>
            <div className="result-details" style={{width: '100%'}}>
              <h4>Projected Traffic Profile</h4>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '1rem'}}>
                <div>
                  <div className="result-unit">Total Adjusted AADT</div>
                  <div className="result-value">{result.projected_aadt.toLocaleString()}</div>
                </div>
                <div>
                  <div className="result-unit">Peak Direction Volume</div>
                  <div className="result-value" style={{color: '#60a5fa'}}>{result.directional_volume.toLocaleString()}</div>
                </div>
              </div>
              <p className="result-subtext" style={{marginTop: '1rem'}}>Model: {result.model_used}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TrafficAnalyzer;
