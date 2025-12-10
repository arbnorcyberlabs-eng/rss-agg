import { defineConfig } from 'vite';
import path from 'path';

// Build both the main app and the admin dashboard HTML entries.
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        admin: path.resolve(__dirname, 'admin.html')
      }
    }
  }
});

