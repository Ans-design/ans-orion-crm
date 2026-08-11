'use client';

import { Skeleton } from '@/components/ui/skeleton';

export function CartSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      <div className="flex flex-col xl:flex-row gap-6">
        <div className="flex-1 space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-[7px] border border-border bg-card p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row gap-4">
                <Skeleton className="h-36 w-full sm:w-40 shrink-0 rounded-[7px]" />
                <div className="flex-1 space-y-3">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/3" />
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((j) => (
                      <Skeleton key={j} className="h-8 w-full" />
                    ))}
                  </div>
                  <Skeleton className="h-10 w-full max-w-xs" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="w-full xl:w-[380px] space-y-4">
          <Skeleton className="h-64 w-full rounded-[7px]" />
          <Skeleton className="h-48 w-full rounded-[7px]" />
        </div>
      </div>
    </div>
  );
}

export function CartErrorState({
  message,
  onRetry,
  onClear,
}: {
  message: string;
  onRetry: () => void;
  onClear?: () => void;
}) {
  return (
    <div className="rounded-[7px] border border-destructive/30 bg-destructive/5 p-8 text-center space-y-4">
      <p className="text-sm text-destructive font-medium">{message}</p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={onRetry}
          className="text-sm font-semibold text-primary hover:underline"
        >
          Réessayer
        </button>
        {onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-sm font-semibold text-muted-foreground hover:text-foreground hover:underline"
          >
            Vider le panier et recommencer
          </button>
        )}
      </div>
    </div>
  );
}
