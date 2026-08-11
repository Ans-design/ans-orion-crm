import {
  getPayrollGrid,
  getPayslipPreview,
  seedEmployeePayrollDefaults,
  updateEmployeePayroll,
} from '@/lib/services/payroll-service';
import type { UpdatePayrollInput } from './rh-payroll.validation';

export async function ensurePayrollDefaults() {
  return seedEmployeePayrollDefaults();
}

export async function getPayrollRecords() {
  return getPayrollGrid();
}

export async function getEmployeePayslipPreview(employeeId: string, period?: string) {
  return getPayslipPreview(employeeId, period);
}

export async function updatePayrollRecord(input: UpdatePayrollInput) {
  const { employeeId, ...data } = input;
  return updateEmployeePayroll(employeeId, data);
}
