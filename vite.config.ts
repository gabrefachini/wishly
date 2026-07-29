import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import fs from "node:fs";

const httpsConfig = process.env.VITE_DEV_HTTPS === "true"
  ? {
    key: fs.readFileSync(process.env.VITE_DEV_HTTPS_KEY || "localhost-key.pem"),
    cert: fs.readFileSync(process.env.VITE_DEV_HTTPS_CERT || "localhost.pem"),
  }
  : undefined;

export default defineConfig({
  plugins: [react()],
  server: {
    https: httpsConfig,
  },
  preview: {
    https: httpsConfig,
  },
});
