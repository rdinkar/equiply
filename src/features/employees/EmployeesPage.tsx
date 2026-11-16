import { PageHeader } from '@/components/ui/layout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function EmployeesPage() {
  useDocumentTitle('Employees')
  return <PageHeader title="Employees" />
}
