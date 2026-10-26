import { defineConfig } from 'tsup';

// TypeScript 7 no longer ships the JS compiler API that tsup's dts mode needs,
// so tsup only bundles JavaScript and `tsc -p tsconfig.build.json` emits the types.
export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'core/index': 'src/core/index.ts',
    'effects/index': 'src/effects/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: false,
  splitting: true,
  treeshake: true,
  clean: true,
  target: 'es2020',
  external: ['react', 'react-dom'],
});
