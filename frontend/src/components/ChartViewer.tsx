import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { BarChart2 } from 'lucide-react';

const ChartViewer: React.FC = () => {
  const [charts, setCharts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCharts = async () => {
      try {
        const response = await axios.get('http://localhost:8000/api/charts');
        setCharts(response.data.charts || []);
      } catch (err) {
        console.error(err);
        setError('Failed to fetch generated charts.');
      } finally {
        setLoading(false);
      }
    };

    fetchCharts();
  }, []);

  if (loading) return <div className="loading">Loading charts...</div>;
  if (error) return <div className="error">{error}</div>;
  if (charts.length === 0) return null;

  return (
    <div className="charts-container">
      <h2><BarChart2 size={24} color="#3b82f6" /> Auto-Generated Analytics</h2>
      <div className="charts-grid">
        {charts.map((chartName, idx) => (
          <div key={idx} className="chart-card">
            <img 
              src={`http://localhost:8000/api/charts/${encodeURIComponent(chartName)}`} 
              alt={chartName}
              className="chart-image"
              loading="lazy"
            />
            <div className="chart-title">
              {chartName.replace('.png', '').replace(/_/g, ' ')}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartViewer;
