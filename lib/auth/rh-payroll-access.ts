import { canViewPayrollAmounts } from '@/lib/auth/margin-access';

/** Champs rémunération — absents du JSON sans rh:payroll_read. */
export const EMPLOYEE_PAYROLL_FIELD_KEYS = [
  'salaireBaseMGA',
  'notesFraisMGA',
  'heuresSup',
  'primeMGA',
] as const;

export type EmployeePayrollFieldKey = (typeof EMPLOYEE_PAYROLL_FIELD_KEYS)[number];

const PAYROLL_KEY_SET = new Set<string>(EMPLOYEE_PAYROLL_FIELD_KEYS);

export function hasPayrollMutationFields(
  data: Record<string, unknown> | null | undefined,
): boolean {
  if (!data) return false;
  return EMPLOYEE_PAYROLL_FIELD_KEYS.some(
    (key) => Object.prototype.hasOwnProperty.call(data, key) && data[key] !== undefined,
  );
}

/** Omet les champs paie (pas 0 / null) si le rôle n'a pas rh:payroll_read. */
export function stripEmployeePayrollFields<T>(employee: T, role: string): T {
  if (employee == null || typeof employee !== 'object') return employee;
  if (canViewPayrollAmounts(role)) return employee;

  if (Array.isArray(employee)) {
    return employee.map((row) => stripEmployeePayrollFields(row, role)) as T;
  }

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(employee as Record<string, unknown>)) {
    if (PAYROLL_KEY_SET.has(key)) continue;
    next[key] = value;
  }
  return next as T;
}
