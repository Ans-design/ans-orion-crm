'use client';

import { useSession } from 'next-auth/react';
import {
  canViewFinancialKPIs,
  canViewMargin,
  canViewNamedTeamPerformance,
} from '@/lib/auth/margin-access';

function useAuthRole(): string {
  const { data: session } = useSession();
  return (session?.user as { role?: string } | undefined)?.role ?? 'user';
}

/** Hook client — affichage marges / coûts (direction & finance uniquement) */
export function useCanViewMargin(): boolean {
  return canViewMargin(useAuthRole());
}

/** CA / KPIs financiers Opérations */
export function useCanViewFinancialKPIs(): boolean {
  return canViewFinancialKPIs(useAuthRole());
}

/** Scores RH nominatifs Performance */
export function useCanViewNamedTeamPerformance(): boolean {
  return canViewNamedTeamPerformance(useAuthRole());
}
