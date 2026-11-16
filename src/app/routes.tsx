import type { RouteObject } from 'react-router'
import type { RouteHandle } from '@/components/layout/Topbar'
import { ActivityPage } from '@/features/activity/ActivityPage'
import { OverviewPage } from '@/features/dashboard/OverviewPage'
import { AssetsPage } from '@/features/assets/AssetsPage'
import { EmployeeDetailPage } from '@/features/employees/EmployeeDetailPage'
import { EmployeesPage } from '@/features/employees/EmployeesPage'
import { OffboardingPage } from '@/features/offboarding/OffboardingPage'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { NotFoundPage } from './NotFoundPage'
import { RootLayout } from './RootLayout'
import { RouteError } from './RouteError'

const crumb = (label: string): RouteHandle => ({ crumb: () => label })

/** Route table, shared by the browser router (App) and memory routers in tests. */
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <OverviewPage />, handle: crumb('Overview') },
      { path: 'assets', element: <AssetsPage />, handle: crumb('Assets') },
      {
        path: 'employees',
        handle: crumb('Employees'),
        children: [
          { index: true, element: <EmployeesPage /> },
          {
            path: ':employeeId',
            element: <EmployeeDetailPage />,
            handle: {
              crumb: ({ params, data }) => data?.employees.find((e) => e.id === params.employeeId)?.name ?? 'Employee',
            } satisfies RouteHandle,
          },
        ],
      },
      { path: 'onboarding', element: <OnboardingPage />, handle: crumb('Onboarding') },
      { path: 'offboarding', element: <OffboardingPage />, handle: crumb('Offboarding') },
      { path: 'activity', element: <ActivityPage />, handle: crumb('Activity Log') },
      { path: '*', element: <NotFoundPage />, handle: crumb('Not found') },
    ],
  },
]
