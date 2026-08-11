import { createEmployee, getEmployeeById, getRhStats, listEmployees, updateEmployee } from '@/lib/services/rh-service';
import type { CreateEmployeeInput, EmployeeListQuery, UpdateEmployeeInput } from './rh.validation';

export function parseEmployeeListQuery(searchParams: URLSearchParams): EmployeeListQuery {
  return {
    departement: searchParams.get('departement') || undefined,
    statut: searchParams.get('statut') || undefined,
    q: searchParams.get('q') || undefined,
    trash: searchParams.get('archived') === '1' || searchParams.get('trash') === '1',
    stats: searchParams.get('stats') === '1',
  };
}

export async function listEmployeeRecords(query: Omit<EmployeeListQuery, 'stats'>) {
  return listEmployees({
    departement: query.departement,
    statut: query.statut,
    q: query.q,
    trash: query.trash,
  });
}

export async function getRhDashboardStats() {
  return getRhStats();
}

export async function createEmployeeRecord(input: CreateEmployeeInput) {
  return createEmployee(input);
}

export async function getEmployeeDetail(id: string) {
  return getEmployeeById(id);
}

export async function updateEmployeeRecord(id: string, input: UpdateEmployeeInput) {
  return updateEmployee(id, input);
}
