import { SearchX } from 'lucide-react'
import { Link } from 'react-router'
import { buttonClasses } from '@/components/ui/buttonStyles'
import { EmptyState } from '@/components/ui/feedback'
import { useDocumentTitle } from '@/hooks/useDocumentTitle'
import { paths } from './paths'

export function NotFoundPage() {
  useDocumentTitle('Page not found')
  return (
    <EmptyState
      icon={SearchX}
      title="This page doesn’t exist"
      description="The link may be out of date. Head back to the overview to keep going."
      action={
        <Link to={paths.overview} className={buttonClasses('primary')}>
          Go to overview
        </Link>
      }
    />
  )
}
