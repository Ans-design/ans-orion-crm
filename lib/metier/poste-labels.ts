/** Labels RH dérivés du chrono atelier (play / pause / charge). */

export type PosteResumeInput = {
  workSec: number;
  pauseSec: number;
  pauseCount: number;
  estimatedSec: number | null;
  openCount: number;
  finishedToday: number;
  running: boolean;
};

export function derivePosteLabels(input: PosteResumeInput): string[] {
  const labels: string[] = [];
  const { workSec, pauseSec, pauseCount, estimatedSec, openCount, finishedToday, running } = input;

  if (estimatedSec && workSec > 0 && workSec < estimatedSec * 0.75) labels.push('Rapide');
  if (estimatedSec && workSec > estimatedSec * 1.25) labels.push('Dépassement');
  if (pauseSec > 600 && (pauseSec > workSec * 0.35 || pauseCount >= 4)) labels.push('Trop de pause');
  if (!running && openCount > 0 && workSec < 300) labels.push('Inactivité');
  if (finishedToday >= 3) labels.push('Dynamique');
  if (finishedToday >= 5) labels.push('Motivé');
  if (openCount >= 6) labels.push('Trop de charge');
  return labels;
}
