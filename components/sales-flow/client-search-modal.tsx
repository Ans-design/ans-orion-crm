'use client';

import { useEffect, useState } from 'react';
import { Search, UserPlus, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useClientSearch, type ClientSearchResult } from '@/hooks/use-client-search';
import { ClientSearchResultItem } from './client-search-result-item';
import { QuickClientCreateForm } from './quick-client-create-form';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (client: ClientSearchResult) => void;
  title?: string;
  description?: string;
};

export function ClientSearchModal({
  open,
  onOpenChange,
  onSelect,
  title = 'Sélectionner un client',
  description = 'Recherchez un client existant dans le CRM pour démarrer la commande.',
}: Props) {
  const { query, setQuery, results, loading, error, retry } = useClientSearch();
  const [mode, setMode] = useState<'search' | 'create'>('search');

  useEffect(() => {
    if (!open) {
      setMode('search');
      setQuery('');
    }
  }, [open, setQuery]);

  const handleSelect = (client: ClientSearchResult) => {
    onSelect(client);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Créer un client rapide' : title}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Enregistrement dans le CRM — le client sera sélectionné automatiquement.'
              : description}
          </DialogDescription>
        </DialogHeader>

        {mode === 'create' ? (
          <QuickClientCreateForm
            onCreated={handleSelect}
            onCancel={() => setMode('search')}
          />
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nom, téléphone, email, NIF, entreprise, axe…"
                className="w-full pl-9 pr-3 py-2.5 rounded-[7px] border border-border bg-background text-sm outline-none focus:ring-2 focus:ring-primary/30"
                autoFocus
              />
            </div>

            {error && (
              <div className="rounded-[7px] border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
                <p>{error}</p>
                <button type="button" onClick={retry} className="mt-2 text-xs font-semibold text-primary inline-flex items-center gap-1">
                  <RefreshCw size={12} /> Réessayer
                </button>
              </div>
            )}

            {loading && <p className="text-sm text-muted-foreground text-center py-4">Recherche…</p>}

            {!loading && !error && query.trim() && results.length === 0 && (
              <div className="text-center py-6 space-y-3">
                <p className="text-sm text-muted-foreground">Aucun client trouvé</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={retry}
                    className="text-xs font-semibold px-3 py-2 rounded-lg border border-border hover:bg-muted/50 inline-flex items-center gap-1"
                  >
                    <RefreshCw size={12} /> Réessayer
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode('create')}
                    className="text-xs font-semibold px-3 py-2 rounded-lg bg-primary text-primary-foreground inline-flex items-center gap-1"
                  >
                    <UserPlus size={12} /> Créer un client rapide
                  </button>
                </div>
              </div>
            )}

            {!loading && results.length > 0 && (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {results.map((c) => (
                  <ClientSearchResultItem key={c.id} client={c} onSelect={handleSelect} />
                ))}
              </div>
            )}

            {!query.trim() && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Saisissez au moins un caractère pour rechercher dans le CRM.
              </p>
            )}

            <div className="pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setMode('create')}
                className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:underline"
              >
                <UserPlus size={12} /> Créer un client rapide
              </button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
