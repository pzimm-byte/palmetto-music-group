import next from 'eslint-config-next';

const config = [
  { ignores: ['mockup/**', '.next/**', 'node_modules/**', 'test-results/**', 'playwright-report/**', 'next-env.d.ts'] },
  ...next,
];
export default config;
