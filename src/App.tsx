import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import { TodayView } from './components/today/TodayView'
import { TasksView } from './components/tasks/TasksView'
import { ProjectsView } from './components/projects/ProjectsView'
import { WhiteboardsView } from './components/whiteboards/WhiteboardsView'
import { CheckSquare, Folder, VideoCamera, BookOpen, PencilCircle } from '@phosphor-icons/react'

// Lazy-load WhiteboardEditor to keep Excalidraw CSS out of the main bundle
const WhiteboardEditor = lazy(() =>
  import('./components/whiteboards/WhiteboardEditor').then(m => ({ default: m.WhiteboardEditor }))
)

function PlaceholderView({ title, icon: Icon, iconColor }: { title: string; icon: typeof CheckSquare; iconColor: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-[60vh] text-center">
      <Icon size={32} className={`${iconColor} mb-3 opacity-40`} />
      <p className="text-text-secondary text-[15px] font-medium">{title}</p>
      <p className="text-text-muted text-[12px] mt-1">Kommer snart</p>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route path="/" element={<TodayView />} />
          <Route path="/tasks" element={<TasksView />} />
          <Route path="/projects" element={<ProjectsView />} />
          <Route path="/projects/:id" element={<ProjectsView />} />
          <Route path="/meetings" element={<PlaceholderView title="Møter" icon={VideoCamera} iconColor="text-amber-400" />} />
          <Route path="/journal" element={<PlaceholderView title="Journal" icon={BookOpen} iconColor="text-teal-400" />} />
          <Route path="/whiteboards" element={<WhiteboardsView />} />
          <Route path="/whiteboards/:id" element={<Suspense fallback={<div className="flex items-center justify-center h-[60vh] text-text-muted text-[13px]">Laster editor...</div>}><WhiteboardEditor /></Suspense>} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
