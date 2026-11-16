import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Server, Activity } from 'lucide-react';

const ArisStatus: React.FC = () => {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [topologyModels, setTopologyModels] = useState<string[]>([]);
  const [trafficModels, setTrafficModels] = useState<string[]>([]);

  useEffect(() => {
    const checkAris = async () => {
      try {
        const [statusRes, topRes, trafRes] = await Promise.all([
          axios.get('http://localhost:8000/api/aris/status'),
          axios.get('http://localhost:8000/api/aris/topology'),
          axios.get('http://localhost:8000/api/aris/traffic'),
        ]);

        if (statusRes.data.loaded) {
          setStatus('online');
          setTopologyModels(topRes.data.available_models || []);
          setTrafficModels(trafRes.data.available_models || []);
        } else {
          setStatus('offline');
        }
      } catch (err) {
        setStatus('offline');
      }
    };
    
    checkAris();
  }, []);

  return (
    <div className="aris-container">
      <div className="aris-header">
        <Server className="aris-icon" size={20} />
        <h3>ARIS .NET Engine Status</h3>
        <div className={`status-indicator ${status}`}>
          <div className="pulse"></div>
          {status.toUpperCase()}
        </div>
      </div>
      
      {status === 'online' && (
        <div className="aris-content">
          <div className="model-group">
            <h4 className="model-title"><Activity size={16} /> Topology Models Loaded</h4>
            <div className="model-badges">
              {topologyModels.map(m => <span key={m} className="badge topology-badge">{m}</span>)}
            </div>
          </div>
          <div className="model-group">
            <h4 className="model-title"><Activity size={16} /> Traffic Models Loaded</h4>
            <div className="model-badges">
              {trafficModels.map(m => <span key={m} className="badge traffic-badge">{m}</span>)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ArisStatus;
