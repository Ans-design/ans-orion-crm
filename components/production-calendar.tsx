'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays } from 'lucide-react';

type Slot = {
  id: string;
  title: string;
  machine?: string | null;
  operateur?: string | null;
  startAt: string;
  endAt: string;
  statut: string;
};

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

export function ProductionCalendar() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);

  const weekEnd = useMemo(() => addDays(weekStart, 7), [weekStart]);
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  useEffect(() => {
    setLoading(true);
    const from = weekStart.toISOString();
    const to = weekEnd.toISOString();
    fetch(`/api/planning?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
      .then((r) => (r.ok ? r.json() : []))
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [weekStart, weekEnd]);

  const slotsForDay = (day: Date) =>
    slots.filter((s) => {
      const start = new Date(s.startAt);
      return start.toDateString() === day.toDateString();
    });

  return (
    <div className="bg-card border border-border rounded-[7px] p-4">
      <div className="flex items-center justify-between gap-3 mb-4">
        <h3 className="font-display font-bold text-sm flex items-center gap-2">
          <CalendarDays size={16} className="text-[#FFD60A]" /> Calendrier atelier
        </h3>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, -7))} className="px-2 py-1 text-xs rounded-lg border border-border hover:bg-accent">← Sem.</button>
          <button type="button" onClick={() => setWeekStart(startOfWeek(new Date()))} className="px-2 py-1 text-xs rounded-lg border border-border hover:bg-accent">Aujourd&apos;hui</button>
          <button type="button" onClick={() => setWeekStart(addDays(weekStart, 7))} className="px-2 py-1 text-xs rounded-lg border border-border hover:bg-accent">Sem. →</button>
        </div>
      </div>
      {loading ? (
        <p className="text-sm text-muted-foreground text-center py-8">Chargement…</p>
      ) : (
        <div className="grid grid-cols-7 gap-2">
          {days.map((day, i) => {
            const daySlots = slotsForDay(day);
            const isToday = day.toDateString() === new Date().toDateString();
            return (
              <div key={day.toISOString()} className={`rounded-lg border p-2 min-h-[120px] ${isToday ? 'border-[#FFD60A]/50 bg-[#FFD60A]/5' : 'border-border'}`}>
                <p className="text-[10px] font-bold uppercase text-muted-foreground">{DAY_LABELS[i]}</p>
                <p className="text-xs font-mono mb-2">{day.getDate()}/{day.getMonth() + 1}</p>
                <div className="space-y-1">
                  {daySlots.slice(0, 4).map((s) => (
                    <div key={s.id} className="text-[10px] bg-accent rounded px-1.5 py-1 truncate" title={s.title}>
                      {new Date(s.startAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} {s.title}
                    </div>
                  ))}
                  {daySlots.length > 4 && (
                    <p className="text-[10px] text-muted-foreground">+{daySlots.length - 4} autres</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {slots.length === 0 && !loading && (
        <p className="text-xs text-muted-foreground text-center mt-3">Aucun créneau planifié cette semaine — module Planning.</p>
      )}
    </div>
  );
}
