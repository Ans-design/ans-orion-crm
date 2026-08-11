'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Loader2, Users, Package, Factory, ClipboardList, RefreshCw } from 'lucide-react';
import { uxToast } from '@/lib/ux/feedback';
import { useHasAnyPermission } from '@/lib/hooks/use-has-permission';
import { ExcelTableActions } from '@/components/admin/excel-table-actions';
import {
  annexeToExcelRow,
  employeeAssignmentToExcelRow,
  validateAnnexesExcelRows,
} from '@/lib/backoffice/annexes-excel-format';
import { ANS } from '@/lib/ans-colors';
import { SITE_FILTER_ALL } from '@/lib/constants/annex';

type AnnexeOverview = {
  code: string;
  name: string;
  statut: string;
  isDefault: boolean;
  stats: { commandes: number; productions: number; machines: number; stockItems: number; employees: number };
};

type AnnexeRecord = { id: string; code: string; name: string; statut: string; isDefault: boolean; adresse?: string | null; ville?: string | null; tel?: string | null; notes?: string | null };

type Employee = { id: string; matricule: string; firstName: string; lastName: string; poste: string; site: string; statut?: string };

export default function AdminAnnexesPage() {
  const [overview, setOverview] = useState<AnnexeOverview[]>([]);
  const [annexeRecords, setAnnexeRecords] = useState<AnnexeRecord[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activeFilter, setActiveFilter] = useState(SITE_FILTER_ALL);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const excelIdsRef = useRef<Record<string, string>>({});
  const canImportAnnexes = useHasAnyPermission(['users:manage', 'settings:write']);

  const prepareExport = useCallback(async () => {
    const r = await fetch('/api/admin-backoffice/annexes/import-excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'prepare-export' }),
    });
    const d = await r.json();
    if (r.ok && d.ok) excelIdsRef.current = d.data?.ids ?? {};
  }, []);

  const load = useCallback(() => {
    setLoading(true);
    return Promise.all([
      fetch('/api/admin/annexes?overview=1').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/admin/annexes').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/rh/employes').then((r) => (r.ok ? r.json() : [])),
      fetch('/api/admin/annexes?filter=1').then((r) => (r.ok ? r.json() : null)),
    ]).then(([ov, annexes, emps, filt]) => {
      setOverview(Array.isArray(ov) ? ov : []);
      setAnnexeRecords(Array.isArray(annexes) ? annexes : []);
      setEmployees(Array.isArray(emps) ? emps : []);
      if (filt?.activeSite) setActiveFilter(filt.activeSite);
    }).finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const setFilter = async (site: string) => {
    setActing(true);
    try {
      const res = await fetch('/api/admin/annexes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_filter', activeSite: site }),
      });
      if (res.ok) {
        const data = await res.json();
        setActiveFilter(data.activeSite);
      }
    } finally {
      setActing(false);
    }
  };

  const assignEmployee = async (employeeId: string, site: string) => {
    setActing(true);
    try {
      await fetch('/api/admin/annexes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign_employee', employeeId, site }),
      });
      load();
    } finally {
      setActing(false);
    }
  };

  return (
    <div className="dashboard-full space-y-6 w-full max-w-none">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2" style={{ color: ANS.bgDark }}>
            <Building2 size={28} style={{ color: ANS.cyan }} />
            Multi-annexes & sites
          </h1>
          <p className="text-sm text-gray-500 mt-1">AX0 / AX1 — filtres workspace, affectation équipes & stock</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load().then(() => uxToast.success('Données actualisées'))}
            disabled={loading || acting}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm border border-border hover:bg-accent"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <ExcelTableActions
            fileStem="annexes-sites"
            sheetName="Annexes"
            validateRows={validateAnnexesExcelRows}
            canImport={canImportAnnexes}
            onBeforeExport={prepareExport}
            getExportRows={() => [
              ...annexeRecords.map((a) =>
                annexeToExcelRow(a, excelIdsRef.current[a.id] ?? null),
              ),
              ...employees
                .filter((e) => e.statut !== 'Inactif')
                .map((e, i) => employeeAssignmentToExcelRow(e, String(i + 1).padStart(3, '0'))),
            ]}
            onImportRows={async (rows, ctx) => {
              const r = await fetch('/api/admin-backoffice/annexes/import-excel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rows, fileName: ctx?.fileName }),
              });
              const d = await r.json();
              if (!r.ok || !d.ok) throw new Error(d.error?.message ?? d.error ?? 'Import impossible');
              load();
              return d.data;
            }}
          />
        </div>
      </div>

      <div className="bg-card rounded-[7px] border border-border p-4 flex flex-wrap items-center gap-3">
        <span className="text-sm font-medium">Filtre workspace :</span>
        <button type="button" disabled={acting} onClick={() => setFilter(SITE_FILTER_ALL)}
          className={`px-3 py-1.5 rounded-lg text-sm border ${activeFilter === SITE_FILTER_ALL ? 'text-white border-transparent' : ''}`}
          style={activeFilter === SITE_FILTER_ALL ? { background: ANS.red } : undefined}>
          Toutes annexes
        </button>
        {overview.map((a) => (
          <button key={a.code} type="button" disabled={acting} onClick={() => setFilter(a.code)}
            className={`px-3 py-1.5 rounded-lg text-sm border font-mono ${activeFilter === a.code ? 'text-white border-transparent' : ''}`}
            style={activeFilter === a.code ? { background: ANS.cyan } : undefined}>
            {a.code}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin" style={{ color: ANS.red }} /></div>
      ) : (
        <>
          <div className="grid md:grid-cols-2 gap-4">
            {overview.map((a) => (
              <div key={a.code} className="bg-card rounded-[7px] border border-border p-5 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-lg font-bold" style={{ color: ANS.red }}>{a.code}</span>
                    {a.isDefault && <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800">Par défaut</span>}
                    <h2 className="font-semibold mt-1">{a.name}</h2>
                    <p className="text-xs text-gray-500">{a.statut}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {[
                    { icon: ClipboardList, label: 'Commandes', v: a.stats.commandes },
                    { icon: Factory, label: 'Productions', v: a.stats.productions },
                    { icon: Package, label: 'Stock actif', v: a.stats.stockItems },
                    { icon: Users, label: 'Employés', v: a.stats.employees },
                  ].map((k) => (
                    <div key={k.label} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      <k.icon size={14} style={{ color: ANS.cyan }} />
                      <span className="text-gray-500">{k.label}</span>
                      <span className="font-bold ml-auto">{k.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-card rounded-[7px] border border-border overflow-hidden">
            <div className="px-4 py-3 border-b font-semibold text-sm">Affectation employés par site</div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Employé</th>
                  <th className="px-4 py-3">Poste</th>
                  <th className="px-4 py-3">Site actuel</th>
                  <th className="px-4 py-3">Changer</th>
                </tr>
              </thead>
              <tbody>
                {employees.filter((e) => e.statut !== 'Inactif').slice(0, 12).map((e) => (
                  <tr key={e.id} className="border-t">
                    <td className="px-4 py-3">{e.firstName} {e.lastName}</td>
                    <td className="px-4 py-3 text-gray-500">{e.poste}</td>
                    <td className="px-4 py-3 font-mono">{e.site}</td>
                    <td className="px-4 py-3">
                      <select defaultValue={e.site} disabled={acting}
                        onChange={(ev) => assignEmployee(e.id, ev.target.value)}
                        className="text-xs border rounded px-2 py-1">
                        {overview.map((a) => <option key={a.code} value={a.code}>{a.code}</option>)}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
