export const EMPLOYEE_STATUSES = ['Actif', 'Inactif', 'Congé'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const PRESENCE_STATUTS = ['Présent', 'Absent', 'Télétravail', 'Congé'] as const;
export type PresenceStatut = (typeof PRESENCE_STATUTS)[number];

export const PRESENCE_DAY_STATUTS = ['Présent', 'Retard', 'Absent', 'Justifié'] as const;
export type PresenceDayStatut = (typeof PRESENCE_DAY_STATUTS)[number];

export const ABSENCE_TYPES = ['Congé payé', 'Maladie', 'Exceptionnel', 'RTT', 'Autre'] as const;
export type AbsenceType = (typeof ABSENCE_TYPES)[number];

export const ABSENCE_STATUTS = ['En attente', 'Validé', 'Refusé'] as const;
export type AbsenceStatut = (typeof ABSENCE_STATUTS)[number];

export const RH_ANNOUNCE_PRIORITIES = ['Normal', 'Important', 'Urgent'] as const;
export type RhAnnouncePriority = (typeof RH_ANNOUNCE_PRIORITIES)[number];

export const DEPARTEMENTS = [
  'Direction',
  'Accueil',
  'Administration',
  'Commercial',
  'Communication',
  'Studio Création',
  'Production',
  'Qualité',
  'Technique',
  'Logistique',
  'Finance',
  'RH',
] as const;

export const LATE_CAUSES = [
  'Transport',
  'Problème perso',
  'Santé',
  'Panne véhicule',
  'Intempéries',
  'Autre',
] as const;

export type LateCause = (typeof LATE_CAUSES)[number];

export const DEFAULT_HORAIRE = { debut: '08:00', fin: '17:00' };
