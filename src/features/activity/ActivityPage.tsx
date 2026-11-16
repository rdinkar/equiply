import { PageHeader } from '@/components/ui/layout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function ActivityPage() {
  useDocumentTitle('Activity Log')
  return <PageHeader title="Activity Log" />
}
