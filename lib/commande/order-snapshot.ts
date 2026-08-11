import type { DevisValidationMeta, QuoteLogisticsSnapshot } from '@/lib/devis-meta';
import { enrichPaymentMeta, resolvePaymentMode, parseDevisNotes } from '@/lib/devis-meta';
import { getCartItemConfigSummary, formatCartConfigSummaryLines } from '@/lib/cart-config-display';
import { isClientFideleFromRecord, buildClientLogisticsDefaults, type ClientForLogistics } from '@/lib/devis/logistics';

export const ORDER_SNAPSHOT_VERSION = 1 as const;

export type OrderPaymentSnapshot = {
  mode: string;
  mobileMoneyProvider?: string;
  bankName?: string;
  reference?: string;
  paymentTime?: string;
  payerName?: string;
  paymentChip?: string;
  montantPaye: number;
  resteAPayer: number;
  paymentStatus: 'soldé' | 'partiel' | 'non payé';
};

export type OrderLogisticsSnapshot = {
  modeExpedition?: string;
  expeditionDetails?: string;
  dateLivraison?: string;
  delaiExecution?: string;
  delaiDetails?: string;
  priorite?: string;
  prioriteDetails?: string;
  deliveryAddress?: string;
  deliveryAxis?: string;
  deliveryLandmark?: string;
  deliveryDetails?: string;
};

export type OrderItemSnapshot = {
  articleId?: string | null;
  articleLabel: string;
  quantity: number;
  unitPrice: number;
  totalLigne: number;
  configSummary: string;
};

export type OrderAcceptSnapshot = {
  version: typeof ORDER_SNAPSHOT_VERSION;
  acceptedAt: string;
  devisId: string;
  devisNumero: string;
  commercial: {
    sousTotal: number;
    remise: number;
    totalHT: number;
    totalTTC: number;
    validUntil: string | null;
  };
  clientSnapshot: QuoteLogisticsSnapshot & {
    clientId?: string | null;
    code?: string;
    fidele?: boolean;
  };
  paymentSnapshot: OrderPaymentSnapshot;
  logisticsSnapshot: OrderLogisticsSnapshot;
  itemsSnapshot: OrderItemSnapshot[];
};

function paymentStatus(montantPaye: number, totalTTC: number): OrderPaymentSnapshot['paymentStatus'] {
  if (montantPaye <= 0) return 'non payé';
  if (montantPaye >= totalTTC) return 'soldé';
  return 'partiel';
}

function paymentModeLabel(meta: DevisValidationMeta): string {
  const mode = resolvePaymentMode(meta);
  if (mode === 'MobileMoney' && meta.mobileMoneyProvider) {
    return `Mobile Money · ${meta.mobileMoneyProvider}`;
  }
  if (mode === 'Virement') return 'Virement bancaire';
  if (mode === 'Cheque') return 'Chèque';
  if (mode === 'Especes') return 'Espèces';
  return mode;
}

export function buildOrderAcceptSnapshot(params: {
  devis: {
    id: string;
    numero: string;
    sousTotal: number;
    remise: number;
    totalHT: number;
    totalTTC: number;
    validUntil: Date | null;
    clientId: string | null;
    client: ClientForLogistics | null;
    lignes: {
      articleId: string;
      articleLabel: string;
      configSnapshot: unknown;
      quantity: number;
      totalLigne: number;
      prixUnitaireForce?: number | null;
      prixUnitaireAuto?: number;
    }[];
  };
  meta: DevisValidationMeta | null;
  acceptedAt?: Date;
}): OrderAcceptSnapshot {
  const { devis, meta } = params;
  const enriched = enrichPaymentMeta(meta ?? {}, devis.totalTTC);
  const montantPaye = enriched.montantPaye ?? 0;
  const resteAPayer = Math.max(0, devis.totalTTC - montantPaye);
  const logistics = meta?.logistics ?? {};

  const clientSnapshot: OrderAcceptSnapshot['clientSnapshot'] = {
    ...logistics,
    clientId: devis.clientId,
    code: (devis.client as { code?: string } | null)?.code,
    fidele: devis.client ? isClientFideleFromRecord(devis.client) : false,
  };

  const itemsSnapshot: OrderItemSnapshot[] = devis.lignes.map((l) => {
    const unit = l.prixUnitaireForce ?? l.prixUnitaireAuto ?? (l.quantity ? l.totalLigne / l.quantity : 0);
    const summary = getCartItemConfigSummary(
      (l.configSnapshot ?? {}) as Record<string, unknown>,
      l.articleId,
      l.quantity,
    );
    return {
      articleId: l.articleId,
      articleLabel: l.articleLabel,
      quantity: l.quantity,
      unitPrice: unit,
      totalLigne: l.totalLigne,
      configSummary: formatCartConfigSummaryLines(summary),
    };
  });

  return {
    version: ORDER_SNAPSHOT_VERSION,
    acceptedAt: (params.acceptedAt ?? new Date()).toISOString(),
    devisId: devis.id,
    devisNumero: devis.numero,
    commercial: {
      sousTotal: devis.sousTotal,
      remise: devis.remise,
      totalHT: devis.totalHT,
      totalTTC: devis.totalTTC,
      validUntil: devis.validUntil?.toISOString() ?? null,
    },
    clientSnapshot,
    paymentSnapshot: {
      mode: paymentModeLabel(enriched),
      mobileMoneyProvider: enriched.mobileMoneyProvider,
      bankName: enriched.bankName,
      reference: enriched.referencePaiement,
      paymentTime: enriched.paymentTime,
      payerName: enriched.payerName,
      paymentChip: enriched.paymentChip,
      montantPaye,
      resteAPayer,
      paymentStatus: paymentStatus(montantPaye, devis.totalTTC),
    },
    logisticsSnapshot: {
      modeExpedition: meta?.modeExpedition,
      expeditionDetails: meta?.expeditionDetails,
      dateLivraison: meta?.dateLivraison,
      delaiExecution: meta?.delaiExecution === 'Autre' ? meta.executionDelayOther : meta?.delaiExecution,
      delaiDetails: meta?.delaiDetails,
      priorite: meta?.priorite,
      prioriteDetails: meta?.prioriteDetails,
      deliveryAddress: logistics.deliveryAddress,
      deliveryAxis: logistics.deliveryAxis,
      deliveryLandmark: logistics.deliveryLandmark,
      deliveryDetails: logistics.deliveryDetails,
    },
    itemsSnapshot,
  };
}

export function parseOrderAcceptSnapshot(raw: unknown): OrderAcceptSnapshot | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as OrderAcceptSnapshot;
  if (o.version !== ORDER_SNAPSHOT_VERSION || !o.devisNumero) return null;
  return o;
}

export function needsOrderSnapshotBackfill(raw: unknown): boolean {
  return parseOrderAcceptSnapshot(raw) === null;
}

type CommandeLigneInput = {
  articleId?: string | null;
  articleLabel: string;
  configSnapshot?: unknown;
  quantity: number;
  totalLigne: number;
  prixUnitaireForce?: number | null;
  prixUnitaireAuto?: number;
};

/** Reconstruit un snapshot v1 depuis une commande existante (backfill ou legacy). */
export function buildOrderSnapshotFromCommande(params: {
  commande: {
    id: string;
    numero: string;
    total: number;
    acompte: number;
    reste: number;
    dateLiv: Date | null;
    priorite: string;
    createdAt: Date;
    clientId: string | null;
  };
  client: ClientForLogistics | null;
  lignes: CommandeLigneInput[];
  devis?: {
    id: string;
    numero: string;
    sousTotal: number;
    remise: number;
    totalHT: number;
    totalTTC: number;
    validUntil: Date | null;
    clientId: string | null;
    notes: string | null;
    lignes: CommandeLigneInput[];
  } | null;
}): OrderAcceptSnapshot {
  const { commande, client, lignes, devis } = params;

  if (devis?.lignes?.length) {
    const { meta } = parseDevisNotes(devis.notes);
    return buildOrderAcceptSnapshot({
      devis: {
        id: devis.id,
        numero: devis.numero,
        sousTotal: devis.sousTotal,
        remise: devis.remise,
        totalHT: devis.totalHT,
        totalTTC: devis.totalTTC,
        validUntil: devis.validUntil,
        clientId: devis.clientId,
        client,
        lignes: devis.lignes.map((l) => ({
          articleId: l.articleId ?? '',
          articleLabel: l.articleLabel,
          configSnapshot: l.configSnapshot,
          quantity: l.quantity,
          totalLigne: l.totalLigne,
          prixUnitaireForce: l.prixUnitaireForce,
          prixUnitaireAuto: l.prixUnitaireAuto,
        })),
      },
      meta,
      acceptedAt: commande.createdAt,
    });
  }

  const clientDefaults = client ? buildClientLogisticsDefaults(client) : {};
  const montantPaye = commande.acompte ?? 0;
  const totalTTC = commande.total;
  const resteAPayer = commande.reste ?? Math.max(0, totalTTC - montantPaye);

  const itemsSnapshot: OrderItemSnapshot[] = lignes.map((l) => {
    const unit = l.prixUnitaireForce ?? l.prixUnitaireAuto ?? (l.quantity ? l.totalLigne / l.quantity : 0);
    const summary = getCartItemConfigSummary(
      (l.configSnapshot ?? {}) as Record<string, unknown>,
      l.articleId ?? '',
      l.quantity,
    );
    return {
      articleId: l.articleId,
      articleLabel: l.articleLabel,
      quantity: l.quantity,
      unitPrice: unit,
      totalLigne: l.totalLigne,
      configSummary: formatCartConfigSummaryLines(summary),
    };
  });

  return {
    version: ORDER_SNAPSHOT_VERSION,
    acceptedAt: commande.createdAt.toISOString(),
    devisId: devis?.id ?? commande.id,
    devisNumero: devis?.numero ?? commande.numero,
    commercial: {
      sousTotal: totalTTC,
      remise: 0,
      totalHT: totalTTC,
      totalTTC,
      validUntil: null,
    },
    clientSnapshot: {
      ...clientDefaults,
      clientId: commande.clientId,
      code: (client as { code?: string } | null)?.code,
      fidele: client ? isClientFideleFromRecord(client) : false,
    },
    paymentSnapshot: {
      mode: montantPaye > 0 ? 'Encaissement enregistré' : 'Non payé',
      montantPaye,
      resteAPayer,
      paymentStatus: paymentStatus(montantPaye, totalTTC),
    },
    logisticsSnapshot: {
      dateLivraison: commande.dateLiv?.toISOString(),
      priorite: commande.priorite,
    },
    itemsSnapshot,
  };
}
