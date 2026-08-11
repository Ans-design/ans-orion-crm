import type { ProductConfig } from './config-types';

type ConfigTypesModule = typeof import('./config-types');

let modulePromise: Promise<ConfigTypesModule> | null = null;

function loadConfigTypesModule(): Promise<ConfigTypesModule> {
  if (!modulePromise) {
    modulePromise = import('./config-types');
  }
  return modulePromise;
}

/** Charge la config produit à la demande (bundle POS allégé au premier paint). */
export async function loadProductConfig(
  articleId: string,
  configType?: string,
): Promise<ProductConfig | null> {
  const mod = await loadConfigTypesModule();
  return mod.getProductConfig(articleId, configType);
}

/** Précharge le module config-types (bundle POS différé). */
export async function preloadConfigTypesModule(): Promise<void> {
  await loadConfigTypesModule();
}

export type { ProductConfig, ConfigSection, ConfigField } from './config-types';
