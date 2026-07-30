import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import DataVisualizer from '@/components/DataVisualizer'
import MoneyFlow from '@/pages/MoneyFlow'
import EmbedChart from '@/pages/EmbedChart'
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

  // Navbar auto-hide state
  const [isNavVisible, setIsNavVisible] = useState(true)
  const [isNavHovered, setIsNavHovered] = useState(false)
  const lastScrollY = useRef(0)
  const inactivityTimer = useRef<number | null>(null)
  const isScrolling = useRef(false)

  // Dark mode effect
  useEffect(() => {
    const root = window.document.documentElement
    if (isDarkMode) {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
  }, [isDarkMode])

  // Start inactivity timer
  const startInactivityTimer = useCallback(() => {
    // Clear existing timer
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current)
    }
    
    // Show navbar when active
    setIsNavVisible(true)
    
    // Set new 5 second timer to hide
    inactivityTimer.current = window.setTimeout(() => {
      // Only hide if not hovering and scrolled down
      if (!isNavHovered && window.scrollY > 50) {
        setIsNavVisible(false)
      }
    }, 1500)
  }, [isNavHovered])

  // Auto-hide navbar logic
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      
      // Show when scrolling up
      if (currentScrollY < lastScrollY.current) {
        setIsNavVisible(true)
      }
      
      // Hide when scrolling down and past 100px
      if (currentScrollY > lastScrollY.current && currentScrollY > 100) {
        // Small delay to not hide immediately
        if (!isScrolling.current) {
          isScrolling.current = true
          setTimeout(() => {
            isScrolling.current = false
          }, 100)
        }
      }
      
      lastScrollY.current = currentScrollY
      
      // Reset inactivity timer on scroll
      startInactivityTimer()
    }

    // Only reset timer on click/touch, not every mouse move
    const handleInteraction = () => {
      startInactivityTimer()
    }

    // Add event listeners
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('click', handleInteraction)
    window.addEventListener('touchstart', handleInteraction)
    
    // Start initial timer
    startInactivityTimer()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('click', handleInteraction)
      window.removeEventListener('touchstart', handleInteraction)
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    }
  }, [startInactivityTimer, isNavHovered])

  return (
    <BrowserRouter>
      <div 
        className={`
          fixed top-0 left-0 right-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60
          transition-transform duration-500 ease-in-out
          ${isNavVisible ? 'translate-y-0' : '-translate-y-full'}
        `}
        onMouseEnter={() => {
          setIsNavHovered(true)
          setIsNavVisible(true)
          // Clear timer when hovering
          if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
        }}
        onMouseLeave={() => {
          setIsNavHovered(false)
          // Start timer when leaving
          startInactivityTimer()
        }}
      >
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

      {/* Spacer for fixed navbar */}
      <div className="h-[72px] sm:h-[80px]" />

      <main className="min-h-screen bg-background transition-colors">
        <Routes>
          <Route path="/" element={<DataVisualizer />} />
          <Route path="/money-flow" element={<MoneyFlow />} />
          <Route path="/embed" element={<EmbedChart />} />
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