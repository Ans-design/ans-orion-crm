import { z } from 'zod';
import { ABSENCE_TYPES, EMPLOYEE_STATUSES, LATE_CAUSES, PRESENCE_STATUTS, RH_ANNOUNCE_PRIORITIES } from '@/lib/constants/rh';

export const createAbsenceInputSchema = z.object({
  employeeId: z.string().optional(),
  type: z.enum(ABSENCE_TYPES),
  dateDebut: z.string().min(1),
  dateFin: z.string().min(1),
  motif: z.string().max(500).optional().nullable(),
});

export const reviewAbsenceInputSchema = z.object({
  id: z.string().min(1),
  statut: z.enum(['Validé', 'Refusé']),
});

export const createEmployeeInputSchema = z.object({
  matricule: z.string().min(1).max(20),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  poste: z.string().min(1).max(100),
  departement: z.string().optional(),
  authRole: z.string().optional(),
  email: z.string().email().optional().nullable(),
  tel: z.string().max(30).optional().nullable(),
  site: z.string().max(10).optional(),
  horaireDebut: z.string().optional().nullable(),
  horaireFin: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
});

export const presenceActionInputSchema = z.object({
  action: z.enum(['checkin', 'checkout']),
  employeeId: z.string().optional(),
});

export const updateEmployeeInputSchema = z.object({
  firstName: z.string().min(1).max(80).optional(),
  lastName: z.string().min(1).max(80).optional(),
  poste: z.string().min(1).max(100).optional(),
  departement: z.string().optional(),
  authRole: z.string().optional(),
  email: z.string().email().optional().nullable(),
  tel: z.string().max(30).optional().nullable(),
  site: z.string().max(10).optional(),
  statut: z.enum(EMPLOYEE_STATUSES).optional(),
  presenceStatut: z.enum(PRESENCE_STATUTS).optional(),
  horaireDebut: z.string().optional().nullable(),
  horaireFin: z.string().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  bio: z.string().max(2000).optional().nullable(),
  station: z.string().max(120).optional().nullable(),
  avatarColor: z.string().max(20).optional().nullable(),
  cantineHeure: z.string().optional().nullable(),
  salaireBaseMGA: z.number().optional(),
  notesFraisMGA: z.number().optional(),
  heuresSup: z.number().int().optional(),
  primeMGA: z.number().optional(),
  congeSolde: z.number().optional(),
});

export const justifyRetardInputSchema = z.object({
  cause: z.string().min(1).max(300),
  remarque: z.string().max(500).optional(),
});

export const lateDeclarationInputSchema = z.object({
  cause: z.enum(LATE_CAUSES as unknown as [string, ...string[]]),
  remarque: z.string().max(2000).optional().nullable(),
});

export const createRhAnnouncementInputSchema = z.object({
  title: z.string().min(1).max(200),
  content: z.string().min(1).max(4000),
  priority: z.enum(RH_ANNOUNCE_PRIORITIES).optional(),
  pinned: z.boolean().optional(),
});

export type CreateAbsenceInput = z.infer<typeof createAbsenceInputSchema>;
export type ReviewAbsenceInput = z.infer<typeof reviewAbsenceInputSchema>;
export type CreateEmployeeInput = z.infer<typeof createEmployeeInputSchema>;
export type PresenceActionInput = z.infer<typeof presenceActionInputSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeInputSchema>;
export type JustifyRetardInput = z.infer<typeof justifyRetardInputSchema>;
export type LateDeclarationInput = z.infer<typeof lateDeclarationInputSchema>;
export const performanceEvaluationInputSchema = z.object({
  employeeId: z.string().min(1),
  ponctualite: z.number().int().min(-5).max(7),
  qualite: z.number().int().min(-5).max(7),
  consignes: z.number().int().min(-5).max(7),
  notes: z.string().max(500).optional().nullable(),
});

export const createRecruitCandidateInputSchema = z.object({
  fullName: z.string().min(1).max(120),
  posteVise: z.string().min(1).max(100),
  stage: z.string().optional(),
  progression: z.number().int().min(0).max(100).optional(),
  score: z.number().min(0).max(10).optional(),
  skills: z.string().max(500).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  interviewDate: z.string().datetime().optional().nullable(),
});

export const updateRecruitCandidateInputSchema = createRecruitCandidateInputSchema.partial().extend({
  id: z.string().min(1),
});

export type CreateRhAnnouncementInput = z.infer<typeof createRhAnnouncementInputSchema>;
export type PerformanceEvaluationInput = z.infer<typeof performanceEvaluationInputSchema>;
export type CreateRecruitCandidateInput = z.infer<typeof createRecruitCandidateInputSchema>;
export type UpdateRecruitCandidateInput = z.infer<typeof updateRecruitCandidateInputSchema>;

export type AbsenceListQuery = {
  statut?: string;
  employeeId?: string;
};

export type EmployeeListQuery = {
  departement?: string;
  statut?: string;
  q?: string;
  trash?: boolean;
  stats: boolean;
};

export type PresenceListQuery = {
  employeeId?: string;
  date: Date;
};
