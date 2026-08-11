/** Tournée livreur — planification logistique Madagascar. */

export type TourneeStatut = 'Planifiée' | 'En cours' | 'Terminée';

export type TourneeLivraison = {
  id: string;
  numero: string;
  livreur: string;
  zone?: string;
  /** YYYY-MM-DD */
  dateTournee: string;
  statut: TourneeStatut;
  /** Ordre de passage */
  livraisonIds: string[];
  createdAt: string;
  updatedAt: string;
};

export type TourneeLivraisonEnriched = TourneeLivraison & {
  livraisons: {
    id: string;
    numero: string;
    statut: string;
    adresseLiv?: string | null;
    colisCount?: number;
    clientName?: string;
  }[];
  colisTotal: number;
  stopsCount: number;
};

export const TOURNEE_CONFIG_KEY = 'logistics_tournees';
