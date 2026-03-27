import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/cli/index.ts'],
    format: ['esm'],
    dts: false,
    sourcemap: false,
  },

  fmt: {
    singleQuote: true,
    trailingComma: 'all',
  },

  lint: {
    options: {
      typeAware: true,
    },
  },

  test: {
    include: ['tests/**/*.test.ts'],
  },
});
