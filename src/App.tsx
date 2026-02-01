import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import DataVisualizer from '@/components/DataVisualizer'
import MoneyFlow from '@/pages/MoneyFlow'
import { Toaster } from 'react-hot-toast'
import { Switch } from '@/components/ui/switch'

// Simple nav link with underline indicator
function NavItem({ to, children }: { to: string; children: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `
        relative font-bold text-lg tracking-wide transition-all duration-300
        ${isActive 
          ? 'text-primary opacity-100' 
          : 'text-foreground/60 hover:text-foreground opacity-70 hover:opacity-100'
        }
      `}
    >
      {({ isActive }) => (
        <>
          <span className="relative z-10 font-medium">{children}</span>
          <span 
            className={`
              absolute -bottom-1 left-0 h-0.5 bg-primary transition-all duration-300
              ${isActive ? 'w-full' : 'w-0 hover:w-full'}
            `}
          />
        </>
      )}
    </NavLink>
  )
}

function App() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      return document.documentElement.classList.contains("dark") || 
             window.matchMedia("(prefers-color-scheme: dark)").matches
    }
    return false
  })

  useEffect(() => {
    const root = window.document.documentElement
    if (isDarkMode) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [isDarkMode])

  return (
    <BrowserRouter>
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <nav className="flex flex-col sm:flex-row items-start sm:items-center justify-between px-4 sm:px-6 py-4 gap-4 max-w-screen mx-auto">
          {/* Left side - Navigation */}
          <div className="flex items-center gap-6 sm:gap-8">
            <NavItem to="/">Data Visualizer</NavItem>
            <NavItem to="/money-flow">Money Flow</NavItem>
          </div>
          
          {/* Right side - Dark Mode Toggle */}
          <label 
            htmlFor="theme-toggle"
            className="flex items-center gap-3 px-4 py-2 rounded-full bg-muted/50 border shadow-sm cursor-pointer hover:bg-muted transition-colors select-none"
          >
            <span className="text-sm font-semibold">Dark Mode</span>
            <Switch 
              id="theme-toggle"
              checked={isDarkMode} 
              onCheckedChange={setIsDarkMode} 
              aria-label="Toggle dark mode"
            />
          </label>
        </nav>
      </div>

      <main className="min-h-screen bg-background transition-colors">
        <Routes>
          <Route path="/" element={<DataVisualizer />} />
          <Route path="/money-flow" element={<MoneyFlow />} />
        </Routes>
      </main>
      
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