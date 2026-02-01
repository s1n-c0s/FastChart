import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import DataVisualizer from '@/components/DataVisualizer'
import MoneyFlow from '@/pages/MoneyFlow'
import { Toaster } from 'react-hot-toast'  // Add this import

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
      
      {/* Move Toaster here - outside Routes so it persists */}
      <Toaster
        position="bottom-center"
        toastOptions={{
          duration: 900,
          style: { background: "black", color: "#fff" },
          iconTheme: { primary: "white", secondary: "black" },
          error: { iconTheme: { primary: "#ef4444", secondary: "black" } },
        }}
      />
    </BrowserRouter>
  )
}

export default App