/**
 * Barrel — configs produit splittées dans ./config-types/
 * Backup monolithe : config-types.monolith.bak.ts
 */
export type { ConfigField, ConfigSection, ProductConfig } from './config-types/types';
export { getProductConfig } from './config-types/registry';
