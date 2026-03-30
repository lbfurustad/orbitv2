import { useState, useEffect, useRef } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { SidebarSimple } from '@phosphor-icons/react'

export function Shell() {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(window.innerWidth < 768)
  const sidebarWidth = useRef(parseInt(localStorage.getItem('orbit-sidebar-width') || '220', 10))
  const [margin, setMargin] = useState(sidebarWidth.current)
  const navigate = useNavigate()
  const location = useLocation()

  // Track mobile breakpoint
  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth < 768
      setIsMobile(mobile)
      if (mobile) setSidebarCollapsed(true)
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // Auto-close sidebar on navigation when mobile
  useEffect(() => {
    if (isMobile && !sidebarCollapsed) {
      setSidebarCollapsed(true)
    }
  }, [location.pathname]) // eslint-disable-line react-hooks/exhaustive-deps

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === '\\') {
        e.preventDefault()
        setSidebarCollapsed(prev => !prev)
      }
      if (e.ctrlKey && e.key === 'ArrowLeft') {
        e.preventDefault()
        if (e.shiftKey) {
          window.dispatchEvent(new CustomEvent('orbit:nav-day', { detail: -1 }))
        } else {
          setSidebarCollapsed(prev => !prev)
        }
      }
      if (e.ctrlKey && e.key === 'ArrowRight') {
        e.preventDefault()
        if (e.shiftKey) {
          window.dispatchEvent(new CustomEvent('orbit:nav-day', { detail: 1 }))
        } else {
          window.dispatchEvent(new CustomEvent('orbit:toggle-calendar'))
        }
      }
      if (e.ctrlKey && e.key === 'd') {
        e.preventDefault()
        navigate('/')
      }
    }
    window.addEventListener('keydown', handler, true)
    return () => window.removeEventListener('keydown', handler, true)
  }, [navigate])

  return (
    <div className="flex min-h-dvh bg-base overflow-x-hidden">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(prev => !prev)}
        onWidthChange={w => setMargin(w)}
      />
      {/* Mobile backdrop */}
      {isMobile && !sidebarCollapsed && (
        <div
          className="fixed inset-0 bg-black/50 z-[9] md:hidden"
          onClick={() => setSidebarCollapsed(true)}
        />
      )}
      <div style={{ marginLeft: isMobile || sidebarCollapsed ? 0 : margin }} className="flex-1 flex flex-col h-dvh bg-base transition-[margin] duration-200">
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden relative">
          {sidebarCollapsed && (
            <button onClick={() => setSidebarCollapsed(false)}
              className="fixed top-3 left-3 z-20 p-1.5 rounded-md text-text-muted hover:text-text-secondary hover:bg-wash/[0.06] transition-colors">
              <SidebarSimple size={18} />
            </button>
          )}
          <Outlet />
          <div className="h-[50vh] shrink-0" />
        </main>
      </div>
    </div>
  )
}
