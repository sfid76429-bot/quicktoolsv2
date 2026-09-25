import { defineConfig } from "vite";
import { fileURLToPath } from "node:url";


const root = fileURLToPath(new URL("./public/", import.meta.url));
const port = Number(process.env.PORT || 5173);

export default defineConfig({
  root,
  base: "/",
  publicDir: false,
  server: {
    host: "0.0.0.0",
    port,
    strictPort: true,
    allowedHosts: true,
  },
  preview: {
    host: "0.0.0.0",
    port,
    allowedHosts: true,
  },
});