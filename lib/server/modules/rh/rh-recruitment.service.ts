import {
  createCandidate,
  deleteCandidate,
  getRecruitmentStats,
  listCandidates,
  RECRUIT_STAGES,
  seedDefaultCandidates,
  updateCandidate,
} from '@/lib/services/recruitment-service';
import type {
  CreateRecruitCandidateInput,
  UpdateRecruitCandidateInput,
} from './rh.validation';

export { RECRUIT_STAGES };

export async function getRhRecruitmentBoard(stage?: string) {
  await seedDefaultCandidates();
  const candidates = await listCandidates(stage);
  return { candidates, stages: RECRUIT_STAGES };
}

export async function getRhRecruitmentStatsBoard() {
  await seedDefaultCandidates();
  const stats = await getRecruitmentStats();
  return { stats, stages: RECRUIT_STAGES };
}

export async function createRhRecruitCandidate(input: CreateRecruitCandidateInput) {
  return createCandidate({
    ...input,
    interviewDate: input.interviewDate ? new Date(input.interviewDate) : null,
  });
}

export async function updateRhRecruitCandidate(input: UpdateRecruitCandidateInput) {
  const { id, interviewDate, ...rest } = input;
  return updateCandidate(id, {
    ...rest,
    interviewDate: interviewDate
      ? new Date(interviewDate)
      : interviewDate === null
        ? null
        : undefined,
  });
}

export async function removeRhRecruitCandidate(id: string) {
  await deleteCandidate(id);
  return { ok: true as const };
}
