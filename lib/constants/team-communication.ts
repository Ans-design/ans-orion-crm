export const SUGGESTION_STATUSES = ['En étude', 'Validé', 'Prioritaire', 'Refusé'] as const;
export type SuggestionStatus = (typeof SUGGESTION_STATUSES)[number];
