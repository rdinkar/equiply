import { completeOffboarding, initiateOffboarding } from '@/domain/offboarding'
import { runMutation } from './runMutation'

export const offboardingService = {
  initiate: (employeeId: string, lastWorkingDay: string) =>
    runMutation((d, ctx) => initiateOffboarding(d, { employeeId, lastWorkingDay }, ctx)),
  complete: (employeeId: string) => runMutation((d, ctx) => completeOffboarding(d, { employeeId }, ctx)),
}
