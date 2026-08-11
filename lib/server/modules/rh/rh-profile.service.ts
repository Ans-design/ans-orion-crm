import { getEmployeeForSession } from '@/lib/services/rh-service';
import { getEmployeePerformance, getLeaderboard } from '@/lib/services/employee-performance-service';

export async function getEmployeeSelfProfile(userId: string, matricule?: string | null) {
  const employee = userId ? await getEmployeeForSession(userId, matricule) : null;
  if (!employee) {
    return {
      employee: null,
      performance: null,
      leaderboard: await getLeaderboard(5),
    };
  }

  const [performance, leaderboard] = await Promise.all([
    getEmployeePerformance(employee.id),
    getLeaderboard(5),
  ]);

  return { employee, performance, leaderboard };
}
