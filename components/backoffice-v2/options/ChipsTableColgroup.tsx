import type { ChipsTableViewMode } from './ChipsDataTable';

type Props = {
  showArticleColumn?: boolean;
  viewMode?: ChipsTableViewMode;
};

/** Colonnes à largeurs fixes — identiques sur tous les blocs. */
export function ChipsTableColgroup({ showArticleColumn = false, viewMode = 'essential' }: Props) {
  void viewMode;
  return (
    <colgroup>
      {showArticleColumn && <col className="col-article" />}
      <col className="col-bloc" />
      <col className="col-champ" />
      <col className="col-label" />
      <col className="col-order" />
      <col className="col-toggle" />
      <col className="col-toggle" />
      <col className="col-toggle" />
      <col className="col-toggle" />
      <col className="col-toggle" />
      <col className="col-toggle" />
      <col className="col-toggle" />
      <col className="col-source" />
    </colgroup>
  );
}
