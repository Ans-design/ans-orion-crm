import { prisma } from '@/lib/prisma';

export const RECRUIT_STAGES = [
  'Présélection',
  'Test Technique',
  'Entretien RH',
  'Offre envoyée',
  'Recruté',
  'Refusé',
] as const;

export async function listCandidates(stage?: string) {
  return prisma.recruitCandidate.findMany({
    where: stage && stage !== 'tous' ? { stage } : undefined,
    orderBy: [{ progression: 'desc' }, { createdAt: 'desc' }],
  });
}

export async function createCandidate(data: {
  fullName: string;
  posteVise: string;
  stage?: string;
  progression?: number;
  score?: number;
  skills?: string | null;
  avatarUrl?: string | null;
  notes?: string | null;
  interviewDate?: Date | null;
}) {
  return prisma.recruitCandidate.create({
    data: {
      fullName: data.fullName.trim(),
      posteVise: data.posteVise.trim(),
      stage: data.stage ?? 'Présélection',
      progression: data.progression ?? 10,
      score: data.score ?? 0,
      skills: data.skills?.trim() || null,
      avatarUrl: data.avatarUrl?.trim() || null,
      notes: data.notes?.trim() || null,
      interviewDate: data.interviewDate ?? null,
    },
  });
}

export async function updateCandidate(
  id: string,
  data: Partial<{
    fullName: string;
    posteVise: string;
    stage: string;
    progression: number;
    score: number;
    skills: string | null;
    notes: string | null;
    interviewDate: Date | null;
  }>,
) {
  return prisma.recruitCandidate.update({ where: { id }, data });
}

export async function deleteCandidate(id: string) {
  return prisma.recruitCandidate.delete({ where: { id } });
}

export async function getRecruitmentStats() {
  const [total, byStage] = await Promise.all([
    prisma.recruitCandidate.count(),
    prisma.recruitCandidate.groupBy({ by: ['stage'], _count: true }),
  ]);
  return { total, byStage: Object.fromEntries(byStage.map((s) => [s.stage, s._count])) };
}

export async function seedDefaultCandidates() {
  const count = await prisma.recruitCandidate.count();
  if (count > 0) return;
  const demos = [
    { fullName: 'Rivo T.', posteVise: 'Opérateur presse', stage: 'Test Technique', progression: 45, score: 7.5, skills: 'Offset, Heidelberg' },
    { fullName: 'Nirina M.', posteVise: 'Graphiste', stage: 'Entretien RH', progression: 72, score: 8.2, skills: 'Illustrator, InDesign, BAT' },
    { fullName: 'Tiana R.', posteVise: 'Commercial', stage: 'Présélection', progression: 20, score: 6.0, skills: 'CRM, prospection B2B' },
    { fullName: 'Haja L.', posteVise: 'Façonnage', stage: 'Offre envoyée', progression: 88, score: 8.8, skills: 'Massicot, pliage, reliure' },
  ];
  await prisma.recruitCandidate.createMany({ data: demos });
}
