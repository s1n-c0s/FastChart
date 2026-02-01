import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'  // Add this
import DataVisualizer from '@/components/DataVisualizer'
import MoneyFlow from '@/pages/MoneyFlow'
import { Toaster } from 'react-hot-toast'
import { Switch } from '@/components/ui/switch'  // Add this

function App() {
  // Move dark mode state here
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") || 
             window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  // Dark mode effect applied globally
  useEffect(() => {
    const root = window.document.documentElement;
    if (isDarkMode) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [isDarkMode]);

  return (
    <BrowserRouter>
      <div className="border-b p-4 bg-background">
        <nav className="flex items-center justify-between">
          <div className="flex gap-4">
            <Link to="/" className="font-semibold text-foreground">Data Visualizer</Link>
            <Link to="/money-flow" className="font-semibold text-foreground">Money Flow</Link>
          </div>
          
          {/* Dark Mode Toggle moved to navbar */}
          <label 
            htmlFor="theme-toggle"
            className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 border shadow-sm cursor-pointer hover:bg-muted transition-colors select-none"
          >
            <span className="text-sm font-semibold text-foreground">Dark Mode</span>
            <Switch 
              id="theme-toggle"
              checked={isDarkMode} 
              onCheckedChange={setIsDarkMode} 
              aria-label="Toggle dark mode"
            />
          </label>
        </nav>
      </div>

      <Routes>
        <Route path="/" element={<DataVisualizer />} />
        <Route path="/money-flow" element={<MoneyFlow />} />
      </Routes>
      
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