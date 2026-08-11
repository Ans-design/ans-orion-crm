import {
  getLeaderboard,
  listPerformanceRows,
  upsertEvaluation,
} from '@/lib/services/employee-performance-service';
import type { PerformanceEvaluationInput } from './rh.validation';

export async function getRhPerformanceDashboard(search?: string) {
  const [rows, leaderboard] = await Promise.all([
    listPerformanceRows(search),
    getLeaderboard(5),
  ]);
  return { rows, leaderboard };
}

export async function saveRhPerformanceEvaluation(
  input: PerformanceEvaluationInput,
  evaluatedBy: string,
) {
  return upsertEvaluation(input.employeeId, {
    ponctualite: input.ponctualite,
    qualite: input.qualite,
    consignes: input.consignes,
    notes: input.notes,
    evaluatedBy,
  });
}
