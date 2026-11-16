import { PageHeader } from '@/components/ui/layout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function OverviewPage() {
  useDocumentTitle('Overview')
  return <PageHeader title="Overview" />
}
