import { PageHeader } from '@/components/ui/layout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function OffboardingPage() {
  useDocumentTitle('Offboarding')
  return <PageHeader title="Offboarding" />
}
