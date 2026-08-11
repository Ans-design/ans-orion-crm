'use client';

import Link from 'next/link';
import { Truck, MapPin, Calendar, Clock, Package } from 'lucide-react';
import type { OrderAcceptSnapshot } from '@/lib/commande/order-snapshot';

type Livraison = { id: string; numero: string; statut: string };

type Props = {
  commandeId: string;
  snapshot: OrderAcceptSnapshot | null;
  dateLiv: string | null;
  priorite: string;
  note: string | null;
  livraisons: Livraison[];
  clientMainAddress?: string;
};

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value?.trim()) return null;
  return (
    <div className="cmd-kv">
      <span className="cmd-kv__label">{label}</span>
      <span className="cmd-kv__value">{value}</span>
    </div>
  );
}

export function OrderLogisticsTab({
  commandeId, snapshot, dateLiv, priorite, note, livraisons, clientMainAddress,
}: Props) {
  const logistics = snapshot?.logisticsSnapshot;
  const deliveryAddr = logistics?.deliveryAddress?.trim();
  const sameAsClient = deliveryAddr && clientMainAddress && deliveryAddr === clientMainAddress;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      <div className="cmd-panel-card">
        <h3 className="cmd-panel-card__title">
          <MapPin size={13} className="text-primary" aria-hidden /> Adresse & expédition
        </h3>
        {deliveryAddr && (
          <span
            className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-[7px] w-fit ${
              sameAsClient ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary'
            }`}
          >
            {sameAsClient ? 'Adresse principale du client' : 'Adresse spécifique à cette commande'}
          </span>
        )}
        <div className="cmd-kv-list">
          <Row label="Adresse" value={logistics?.deliveryAddress} />
          <Row label="Axe / zone" value={logistics?.deliveryAxis} />
          <Row label="Repère" value={logistics?.deliveryLandmark} />
          <Row label="Mode" value={logistics?.modeExpedition} />
          <Row label="Détails" value={logistics?.expeditionDetails ?? logistics?.deliveryDetails} />
        </div>
        {!logistics?.deliveryAddress && !note && (
          <p className="cmd-article-meta italic">
            Adresse non renseignée dans le snapshot — voir devis source.
          </p>
        )}
      </div>

      <div className="cmd-panel-card">
        <h3 className="cmd-panel-card__title">
          <Calendar size={13} className="text-[#F97316]" aria-hidden /> Planning livraison
        </h3>
        <div className="cmd-kv-list">
          <Row
            label="Date prévue"
            value={
              dateLiv
                ? new Date(dateLiv).toLocaleDateString('fr-FR')
                : logistics?.dateLivraison
                  ? new Date(logistics.dateLivraison).toLocaleDateString('fr-FR')
                  : undefined
            }
          />
          <Row label="Délai" value={logistics?.delaiExecution} />
          <Row label="Priorité" value={logistics?.priorite ?? priorite} />
          <Row label="Détails priorité" value={logistics?.prioriteDetails} />
        </div>
      </div>

      <div className="cmd-panel-card lg:col-span-2">
        <h3 className="cmd-panel-card__title">
          <Truck size={13} className="text-emerald-600" aria-hidden /> Livraisons ({livraisons.length})
        </h3>
        {livraisons.length === 0 ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 py-0.5">
            <p className="cmd-article-meta m-0">Aucune livraison planifiée pour cette commande.</p>
            <Link
              href={`/livraisons?commande=${commandeId}`}
              className="inline-flex items-center gap-1 h-8 px-3 rounded-[7px] bg-primary text-white text-[11px] font-bold hover:opacity-90 w-fit"
            >
              <Package size={12} aria-hidden /> Planifier la livraison
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {livraisons.map((l) => (
              <div key={l.id} className="cmd-kv">
                <Link href={`/livraisons?id=${l.id}`} className="cmd-kv__value font-mono text-primary hover:underline">
                  {l.numero}
                </Link>
                <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-[7px] bg-muted text-muted-foreground w-fit">
                  {l.statut}
                </span>
              </div>
            ))}
            <Link
              href={`/livraisons?commande=${commandeId}`}
              className="cmd-panel-card__link inline-block mt-0.5"
            >
              + Nouvelle livraison
            </Link>
          </div>
        )}
      </div>

      {note && (
        <div className="cmd-panel-card lg:col-span-2">
          <h3 className="cmd-panel-card__title">
            <Clock size={13} aria-hidden /> Note logistique
          </h3>
          <p className="cmd-article-meta whitespace-pre-wrap" style={{ WebkitLineClamp: 'unset' as unknown as number }}>
            {note}
          </p>
        </div>
      )}
    </div>
  );
}
