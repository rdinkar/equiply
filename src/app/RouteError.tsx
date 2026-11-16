import { Link, isRouteErrorResponse, useRouteError } from 'react-router'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { Logo } from '@/components/layout/Logo'

/** Last-resort boundary for errors thrown while rendering a route. */
export function RouteError() {
  const error = useRouteError()
  const message = isRouteErrorResponse(error)
    ? `${error.status} ${error.statusText}`
    : error instanceof Error
      ? error.message
      : 'Unknown error'
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <Logo />
      <h1 className="text-lg font-semibold">Something went wrong on this page</h1>
      <p className="max-w-md text-sm text-zinc-600">{message}</p>
      <Link to="/" className={buttonClasses('primary')}>
        Back to overview
      </Link>
    </div>
  )
}
