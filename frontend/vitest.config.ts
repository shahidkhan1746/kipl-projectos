import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Extends the build config rather than restating it, so the '@' alias has one
// definition. Kept in a separate file so `vite build` never has to resolve
// anything from vitest.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      // These talk to a real loopback HTTP server, not a DOM. Component tests
      // added later can opt into jsdom per file with a @vitest-environment
      // docblock, or this can move to a projects config.
      environment: 'node',
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  }),
)
