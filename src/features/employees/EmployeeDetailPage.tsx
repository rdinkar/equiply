import { PageHeader } from '@/components/ui/layout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function EmployeeDetailPage() {
  useDocumentTitle('Employee')
  return <PageHeader title="Employee" />
}
