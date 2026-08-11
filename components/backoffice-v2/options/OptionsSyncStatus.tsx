type Props = {
  unpublishedChanges?: number;
  lastPublishedAt?: string | null;
};

export function OptionsSyncStatus({ unpublishedChanges = 0, lastPublishedAt }: Props) {
  const dirty = unpublishedChanges > 0;
  return (
    <div className={`ab2-options-sync${dirty ? ' is-dirty' : ' is-synced'}`}>
      <span className="ab2-options-sync-dot" aria-hidden />
      <span>
        {dirty
          ? `${unpublishedChanges} modification(s) non publiée(s)`
          : 'Synchronisé avec POS'}
      </span>
      {lastPublishedAt && !dirty && (
        <span className="ab2-options-sync-meta">
          · {new Date(lastPublishedAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
        </span>
      )}
    </div>
  );
}
