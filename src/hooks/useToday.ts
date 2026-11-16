import { useState } from 'react'
import { toISODate } from '@/utils/date'

/** Today's calendar date (YYYY-MM-DD), fixed for the component's lifetime. */
export function useToday(): string {
  const [today] = useState(() => toISODate(new Date()))
  return today
}
