/** Overrides runtime POS issus de ProductOptionGroup / ProductOptionValue (backoffice). */
export type OptionDependencyRule = {
  sourceField: string;
  sourceValue: string;
  targetField: string;
  allowedValues: string[];
  action?: string;
};

export type FieldOptionOverride = {
  fieldKey: string;
  groupId: string;
  active: boolean;
  visiblePos: boolean;
  impactsPrice: boolean;
  impactsStock: boolean;
  impactsProduction: boolean;
  isInformational: boolean;
  metadata: Record<string, unknown> | null;
  /** Labels de valeurs désactivées (ex. une couleur). */
  inactiveValueLabels: string[];
  /** Labels actifs provenant de l’Admin (remplacent / enrichissent les chips). */
  activeValueLabels?: string[];
  /** Dépendances d’options (ex. type housse → formats). */
  dependencies?: OptionDependencyRule[];
};

export type ProductOptionOverrides = {
  articleId: string;
  fields: Record<string, FieldOptionOverride>;
  /** Dépendances globales article (souvent stockées sur le groupe type). */
  dependencies?: OptionDependencyRule[];
};
