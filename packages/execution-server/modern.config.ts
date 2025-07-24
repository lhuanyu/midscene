import { defineConfig, moduleTools } from '@modern-js/module-tools';
import { version } from './package.json';

export default defineConfig({
  plugins: [moduleTools()],
  buildPreset: 'npm-library',
  buildConfig: {
    input: {
      index: 'src/index.ts',
      server: 'src/server.ts',
    },
    externals: ['express', 'cors', 'uuid', 'ws'],
    target: 'es2020',
    define: {
      __VERSION__: version,
    },
    splitting: true,
    sourceMap: true,
    format: 'cjs',
    platform: 'node',
  },
});
