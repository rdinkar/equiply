import { PageHeader } from '@/components/ui/layout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function OnboardingPage() {
  useDocumentTitle('Onboarding')
  return <PageHeader title="Onboarding" />
}
