import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import DataVisualizer from '@/components/DataVisualizer'
import MoneyFlow from '@/pages/MoneyFlow'

function App() {
  return (
    <BrowserRouter>
      <div className="border-b p-4">
        <nav className="flex gap-4">
          <Link to="/" className="font-semibold">Data Visualizer</Link>
          <Link to="/money-flow" className="font-semibold">Money Flow</Link>
        </nav>
      </div>

      <Routes>
        <Route path="/" element={<DataVisualizer />} />
        <Route path="/money-flow" element={<MoneyFlow />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
