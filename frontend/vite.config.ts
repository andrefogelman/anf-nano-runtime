import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 3000,
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // dxf-viewer faz `import opentype from "opentype.js"` (default import).
      // O .mjs do opentype.js v1.3 só tem named exports; aliar para o CJS resolve.
      "opentype.js": path.resolve(
        __dirname,
        "./node_modules/opentype.js/dist/opentype.js",
      ),
    },
  },
  build: {
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-select",
            "@radix-ui/react-popover",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-tabs",
          ],
          "vendor-pdf": ["react-pdf", "pdfjs-dist"],
          "vendor-charts": ["recharts"],
          "vendor-excel": ["exceljs"],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-dxf": ["dxf-viewer", "opentype.js"],
        },
      },
    },
  },
});
