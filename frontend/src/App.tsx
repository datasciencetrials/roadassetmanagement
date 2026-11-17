import ManualSearch from './components/ManualSearch'
import ChartViewer from './components/ChartViewer'
import ArisStatus from './components/ArisStatus'
import ChatBot from './components/ChatBot'
import TrafficAnalyzer from './components/TrafficAnalyzer'

function App() {
  return (
    <div className="app-container">
      <header className="header">
        <h1>Uganda Road Asset Management AI Engine</h1>
        <p>Semantic Search & Intelligent Document Analytics</p>
      </header>
      
      <main style={{ display: 'flex', flexDirection: 'column', gap: '3rem' }}>
        <section>
          <ArisStatus />
        </section>
        
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <ChatBot />
          <TrafficAnalyzer />
        </section>
        
        <section>
          <ManualSearch />
        </section>
        
        <section>
          <ChartViewer />
        </section>
      </main>
    </div>
  )
}

export default App
