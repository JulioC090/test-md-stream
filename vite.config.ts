import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  base: "/test-md-stream/",
  plugins: [tailwindcss(), react()],
});
