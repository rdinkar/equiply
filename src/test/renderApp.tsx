import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RouterProvider, createMemoryRouter } from 'react-router'
import { routes } from '@/app/routes'
import { ToastProvider } from '@/components/ui/ToastProvider'
import { WorkspaceProvider } from '@/store/WorkspaceProvider'

/** Render the real app (providers + routes) at a URL, the way a user would arrive. */
export function renderApp(path = '/') {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  const view = render(
    <ToastProvider>
      <WorkspaceProvider>
        <RouterProvider router={router} />
      </WorkspaceProvider>
    </ToastProvider>,
  )
  return { ...view, router, user }
}
