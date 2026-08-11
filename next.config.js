const path = require('path');

const isDev = process.env.NODE_ENV === 'development';
const isHostingerProd =
  !isDev &&
  (process.env.USE_PRODUCTION_DB === 'true' ||
    process.env.HOSTINGER === 'true' ||
    Boolean(process.env.HOSTINGER_SITE_URL) ||
    process.env.DATABASE_URL?.startsWith('postgres'));

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/logs', destination: '/historique', permanent: true },
      { source: '/audit', destination: '/historique', permanent: true },
      { source: '/admin-prix', destination: '/administration/articles', permanent: true },
      { source: '/prix', destination: '/administration/articles', permanent: true },
      { source: '/tarifs', destination: '/administration/prix', permanent: false },
      { source: '/admin-control', has: [{ type: 'query', key: 'tab', value: 'tarification' }], destination: '/administration/articles', permanent: false },
      { source: '/admin-control', has: [{ type: 'query', key: 'tab', value: 'prix2026' }], destination: '/administration/prix', permanent: false },
      { source: '/admin-control', has: [{ type: 'query', key: 'tab', value: 'matieres' }], destination: '/administration/matieres', permanent: false },
      { source: '/admin-control', has: [{ type: 'query', key: 'tab', value: 'anomalies' }], destination: '/administration/regles-metier', permanent: false },
      { source: '/hub-config', destination: '/administration/vue-ensemble', permanent: true },
      { source: '/hub-configuration', destination: '/administration/vue-ensemble', permanent: true },
      { source: '/admin-control', has: [{ type: 'query', key: 'tab', value: 'chips' }], destination: '/administration/options', permanent: false },
      { source: '/admin-control', has: [{ type: 'query', key: 'tab', value: 'variables' }], destination: '/administration/variables', permanent: false },
      { source: '/admin-control', has: [{ type: 'query', key: 'tab', value: 'apercus' }], destination: '/administration/apercus', permanent: false },
      { source: '/admin-control', has: [{ type: 'query', key: 'tab', value: 'fonctions' }], destination: '/administration/parametres', permanent: false },
      { source: '/admin-control', has: [{ type: 'query', key: 'tab', value: 'versions' }], destination: '/administration/historique', permanent: false },
      { source: '/admin-control', has: [{ type: 'query', key: 'tab', value: 'acces' }], destination: '/administration/roles-permissions', permanent: false },
      { source: '/admin-control', destination: '/administration/vue-ensemble', permanent: false },
      { source: '/backoffice', destination: '/administration/vue-ensemble', permanent: false },
      { source: '/admin/pricing', has: [{ type: 'query', key: 'tab', value: 'articles' }], destination: '/administration/articles', permanent: false },
      { source: '/admin/pricing', has: [{ type: 'query', key: 'tab', value: 'apercus' }], destination: '/administration/apercus', permanent: false },
      { source: '/admin/pricing', has: [{ type: 'query', key: 'tab', value: 'chips' }], destination: '/administration/options', permanent: false },
      { source: '/admin/pricing', has: [{ type: 'query', key: 'tab', value: 'variables' }], destination: '/administration/variables', permanent: false },
      { source: '/admin/pricing', has: [{ type: 'query', key: 'tab', value: 'matieres' }], destination: '/administration/matieres', permanent: false },
      { source: '/admin/matieres', destination: '/administration/matieres', permanent: true },
      { source: '/admin/stock/matieres', destination: '/administration/matieres', permanent: true },
      { source: '/admin/stock/grammages', destination: '/administration/matieres?view=declinaisons&type=grammage', permanent: true },
      { source: '/admin/stock/laizes', destination: '/administration/matieres?view=declinaisons&type=laize', permanent: true },
      { source: '/admin/stock/lie', destination: '/administration/matieres?view=stock', permanent: true },
      { source: '/admin/stock/fournisseurs', destination: '/administration/matieres?view=stock', permanent: true },
      { source: '/admin/stock/alertes', destination: '/administration/matieres?view=alertes', permanent: true },
      { source: '/admin/pricing', has: [{ type: 'query', key: 'tab', value: 'prix2026' }], destination: '/administration/prix', permanent: false },
      { source: '/admin/pricing', has: [{ type: 'query', key: 'tab', value: 'fonctions' }], destination: '/administration/parametres', permanent: false },
      { source: '/admin/pricing', has: [{ type: 'query', key: 'tab', value: 'versions' }], destination: '/administration/historique', permanent: false },
      { source: '/admin/pricing', has: [{ type: 'query', key: 'tab', value: 'acces' }], destination: '/administration/roles-permissions', permanent: false },
      { source: '/admin/pricing', has: [{ type: 'query', key: 'tab', value: 'anomalies' }], destination: '/administration/regles-metier', permanent: false },
      { source: '/admin/pricing', destination: '/administration/vue-ensemble', permanent: false },
      { source: '/ans-talk', destination: '/messagerie', permanent: false },
      { source: '/chat', destination: '/messagerie', permanent: false },
      { source: '/gpao', destination: '/production', permanent: true },
      { source: '/kanban', destination: '/production', permanent: true },
      { source: '/cockpit', destination: '/dashboard', permanent: true },
      { source: '/crm/clients', destination: '/clients', permanent: true },
      { source: '/catalogue-pos', destination: '/pos', permanent: true },
      { source: '/panier-devis', destination: '/panier', permanent: true },
      { source: '/communication/ans-talk', destination: '/messagerie', permanent: true },
      { source: '/finance/paiements', destination: '/paiements', permanent: true },
      { source: '/finance/factures', destination: '/factures', permanent: true },
      { source: '/logistique', destination: '/livraisons', permanent: true },
      { source: '/rh/equipements', destination: '/machines', permanent: false },
      // Paramètres legacy → zones Administration (zéro suppression, une seule face)
      {
        source: '/parametres/regles',
        destination: '/administration/catalogue-prix-stock?studio=calculs&tab=regles&fm=rules',
        permanent: false,
      },
      {
        source: '/parametres/matieres',
        destination: '/administration/catalogue-prix-stock?studio=matieres',
        permanent: false,
      },
      {
        source: '/parametres/configuration',
        destination: '/administration/vue-ensemble',
        permanent: false,
      },
      {
        source: '/parametres/donnees',
        destination: '/administration/import-export',
        permanent: false,
      },
      {
        source: '/parametres/securite',
        destination: '/administration/roles-permissions',
        permanent: false,
      },
      // Alias aperçus legacy → section Administration (page dédiée conservée via legacy workspace)
      { source: '/admin/apercus', destination: '/administration/apercus', permanent: false },
      // Canonique Administration — deep links /admin/* (query préservée par Next)
      { source: '/admin', destination: '/administration/vue-ensemble', permanent: false },
      {
        source: '/admin/permissions',
        destination: '/administration/roles-permissions',
        permanent: false,
      },
      {
        source: '/admin/vue',
        destination: '/administration/vue-ensemble',
        permanent: false,
      },
    ];
  },
  distDir: process.env.NEXT_DIST_DIR || '.next',
  ...(process.env.NEXT_OUTPUT_MODE && !isDev ? { output: process.env.NEXT_OUTPUT_MODE } : {}),
  // Ne jamais forcer assetPrefix/basePath en dev — casse les chunks /_next/static
  ...(isDev
    ? {}
    : {
        ...(process.env.ASSET_PREFIX ? { assetPrefix: process.env.ASSET_PREFIX } : {}),
        ...(process.env.BASE_PATH ? { basePath: process.env.BASE_PATH } : {}),
      }),
  productionBrowserSourceMaps: false,
  ...(isDev
    ? {
        onDemandEntries: {
          maxInactiveAge: 60 * 60 * 1000,
          pagesBufferLength: 8,
        },
      }
    : {}),
  experimental: {
    instrumentationHook: true,
    optimizePackageImports: [
      'lucide-react',
      'recharts',
      'date-fns',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-popover',
      '@radix-ui/react-tabs',
      '@radix-ui/react-tooltip',
    ],
    ...(isHostingerProd
      ? {}
      : {
          outputFileTracingIncludes: {
            '/api/**/*': ['./prisma/demo.db'],
            '/**': ['./prisma/demo.db'],
          },
        }),
    ...(process.env.VERCEL ? {} : { outputFileTracingRoot: path.join(__dirname) }),
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: { unoptimized: true },
  webpack: (config, { isServer, webpack }) => {
    // Turbopack local : ne pas customiser webpack (évite warning + divergences).
    if (process.env.TURBOPACK) return config;
    // Sentry / OpenTelemetry : require dynamique → warning webpack bruyant (sans DSN en local).
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /require-in-the-middle/ },
      { module: /@opentelemetry\/instrumentation/ },
      { message: /Critical dependency: require function is used/ },
      { message: /Critical dependency: the request of a dependency is an expression/ },
    ];
    // Archives PRIX 2026 hors bundle client (PRX-01) — lecture scripts/fs uniquement.
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /[\\/]archives[\\/]pricing[\\/]prix-2026-grids[\\/]/,
      }),
    );
    if (isServer) {
      config.externals = config.externals || [];
    }
    return config;
  },
};

const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);
