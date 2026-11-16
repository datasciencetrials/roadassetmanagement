import React, { useState } from 'react';
import axios from 'axios';
import { Search, FileText } from 'lucide-react';

interface SearchResult {
  document: string;
  page: number;
  snippet: string;
  distance: number;
}

const ManualSearch: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || query.length < 3) return;

    setLoading(true);
    setError('');

    try {
      const response = await axios.get(`http://localhost:8000/api/search?q=${encodeURIComponent(query)}`);
      setResults(response.data.results || []);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch search results. Make sure the backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="search-container">
      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-wrapper">
          <Search className="search-icon" size={20} />
          <input
            type="text"
            className="search-input"
            placeholder="Search manuals for terms like 'texture', 'axle load', or 'pavement'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <button type="submit" className="search-button" disabled={loading || query.length < 3}>
          {loading ? 'Searching...' : 'Search'}
        </button>
      </form>

      {error && <div className="error">{error}</div>}

      {results.length > 0 && (
        <div className="results-grid">
          {results.map((res, idx) => (
            <div key={idx} className="result-card">
              <div className="result-header">
                <div className="result-doc">
                  <FileText size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'text-bottom' }} />
                  {res.document.replace(/_/g, ' ')}
                </div>
                <div className="result-page">Page {res.page}</div>
              </div>
              <div className="result-snippet">
                {res.snippet}
              </div>
            </div>
          ))}
        </div>
      )}
      
      {!loading && !error && query.length > 2 && results.length === 0 && (
        <div className="loading" style={{marginTop: '1rem'}}>No results found for "{query}".</div>
      )}
    </div>
  );
};

export default ManualSearch;
