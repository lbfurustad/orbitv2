import { useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import { Sun, Moon, CheckSquare, Folder, VideoCamera, BookOpen, Planet, MagnifyingGlass, Plus, SidebarSimple, PencilCircle } from '@phosphor-icons/react'
import { useTheme } from '../../lib/hooks/useTheme'
import { useResizable } from '../../lib/hooks/useResizable'

interface SidebarProps {
  collapsed?: boolean
  onToggle?: () => void
  onWidthChange?: (width: number) => void
}

export function Sidebar({ collapsed, onToggle, onWidthChange }: SidebarProps) {
  const { theme, toggle } = useTheme()
  const { width, onMouseDown } = useResizable({ storageKey: 'orbit-sidebar-width', defaultWidth: 220, minWidth: 180, maxWidth: 320 })

  // Notify parent of width changes
  useEffect(() => {
    if (onWidthChange) onWidthChange(width)
  }, [width, onWidthChange])

  return (
    <>
      {/* Sidebar */}
      <aside style={{ width }} className={`h-dvh bg-sidebar flex flex-col fixed left-0 top-0 z-10 transition-transform duration-200 ${collapsed ? '-translate-x-full' : 'translate-x-0'}`}>
        {/* Resize handle */}
        <div
          onMouseDown={onMouseDown}
          className="absolute top-0 right-0 w-[3px] h-full cursor-col-resize z-20 hover:bg-accent/30 active:bg-accent/40 transition-colors"
        />
        {/* Logo + header — draggable in PWA mode */}
        <div className="px-4 pt-4 pb-2 space-y-3 titlebar-drag">
          <div className="flex items-center gap-2.5">
            <Planet size={20} weight="duotone" className="text-accent" />
            <span className="font-semibold text-[14px] text-text-primary tracking-[-0.01em] flex-1">Orbit</span>
            <button onClick={onToggle} title="Skjul sidebar (Ctrl+\)"
              className="p-1 rounded-md text-text-muted hover:text-text-secondary hover:bg-wash/[0.06] transition-colors">
              <SidebarSimple size={16} />
            </button>
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-3 py-2 space-y-[1px]">
          <NavItem to="/" icon={Sun} label="I dag" iconColor="text-amber-300" />

          <div className="pt-4 pb-1.5 px-2">
            <span className="text-[11px] font-medium text-text-muted/60 uppercase tracking-wider">Workspace</span>
          </div>
          <NavItem to="/tasks" icon={CheckSquare} label="Tasks" iconColor="text-emerald-400" />
          <NavItem to="/projects" icon={Folder} label="Prosjekter" iconColor="text-red-400" />
          <NavItem to="/meetings" icon={VideoCamera} label="Møter" iconColor="text-amber-400" />
          <NavItem to="/journal" icon={BookOpen} label="Journal" iconColor="text-teal-400" />
          <NavItem to="/whiteboards" icon={PencilCircle} label="Whiteboards" iconColor="text-pink-400" />
        </nav>

        {/* Theme toggle */}
        <div className="px-3 pb-3">
          <button onClick={toggle} title={theme === 'dark' ? 'Bytt til lys modus' : 'Bytt til mørk modus'}
            className="flex items-center gap-2.5 w-full px-2.5 py-[6px] rounded-md text-[13px] text-text-secondary hover:bg-wash/[0.03] hover:text-text-primary transition-colors">
            {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
            {theme === 'dark' ? 'Mørk modus' : 'Lys modus'}
          </button>
        </div>
      </aside>
    </>
  )
}

function NavItem({ to, icon: Icon, label, iconColor, disabled }: { to: string; icon: typeof Sun; label: string; iconColor?: string; disabled?: boolean }) {
  if (disabled) {
    return (
      <div className="flex items-center gap-2.5 px-2.5 py-[6px] rounded-md text-[13px] text-text-muted/40 cursor-not-allowed">
        <Icon size={16} className={iconColor ? iconColor + '/40' : ''} />
        {label}
      </div>
    )
  }

  return (
    <NavLink
      to={to}
      end={to === '/'}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-2.5 py-[6px] rounded-md text-[13px] transition-all duration-100 ${
          isActive
            ? 'bg-wash/[0.07] text-text-primary font-medium'
            : 'text-text-secondary hover:bg-wash/[0.03] hover:text-text-primary'
        }`
      }
    >
      <Icon size={16} className={iconColor} />
      {label}
    </NavLink>
  )
}
