import { addNewHire, completeOnboarding } from '@/domain/onboarding'
import type { Employee, NewHireInput, WorkspaceData } from '@/types/domain'
import { runCreate, runMutation } from './runMutation'

export const onboardingService = {
  async addHire(input: NewHireInput): Promise<{ data: WorkspaceData; employee: Employee }> {
    const { data, created } = await runCreate((current, ctx) => {
      const out = addNewHire(current, input, ctx)
      return { data: out.data, created: out.employee }
    })
    return { data, employee: created }
  },
  complete: (employeeId: string) => runMutation((d, ctx) => completeOnboarding(d, { employeeId }, ctx)),
}
