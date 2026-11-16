import { RouterProvider, createBrowserRouter } from 'react-router'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { WorkspaceProvider } from '@/store/WorkspaceProvider'
import { routes } from './routes'

const router = createBrowserRouter(routes)

export function App() {
  return (
    <ToastProvider>
      <WorkspaceProvider>
        <RouterProvider router={router} />
      </WorkspaceProvider>
    </ToastProvider>
  )
}
