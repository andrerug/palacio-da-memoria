import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

// Nenhuma chave de API entra no código publicado: cada pessoa usa a própria,
// salva só no navegador dela (botão "Chave" no app).
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, '.') },
  },
});
