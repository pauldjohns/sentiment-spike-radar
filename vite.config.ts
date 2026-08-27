
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// Environment variable to optionally disable lovable-tagger
const DISABLE_TAGGER = process.env.DISABLE_LOVABLE_TAGGER === 'true';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    // Conditionally include lovable-tagger only in development and when not disabled
    mode === 'development' && !DISABLE_TAGGER && componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress unload event listener warnings in build
        if (warning.code === 'UNRESOLVED_IMPORT' || 
            (warning.message && (
              warning.message.includes('unload') ||
              warning.message.includes('Unload event listeners are deprecated') ||
              warning.message.includes('beforeunload')
            ))) {
          return;
        }
        warn(warning);
      }
    }
  },
  optimizeDeps: {
    exclude: ['lovable-tagger']
  },
  // Enhanced defines for warning suppression
  define: {
    __SUPPRESS_UNLOAD_WARNINGS__: mode === 'development',
    __DISABLE_DEPRECATION_WARNINGS__: mode === 'development'
  },
  // Additional esbuild configuration to suppress warnings
  esbuild: {
    logLevel: 'error', // Only show errors, not warnings
    legalComments: 'none'
  },
  test: {
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    globals: true
  }
}));
