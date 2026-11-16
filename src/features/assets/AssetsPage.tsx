import { PageHeader } from '@/components/ui/layout'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'

export function AssetsPage() {
  useDocumentTitle('Assets')
  return <PageHeader title="Assets" />
}
