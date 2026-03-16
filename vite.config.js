import {defineConfig} from 'vite'
import vue from '@vitejs/plugin-vue'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],

    // Caminho base para o GitHub Pages
    base: '/bat-saldo/',

    server: {
        // Configuração para garantir que o Hot Load (HMR) funcione perfeitamente no WSL2
        watch: {
            usePolling: true,
        },
        // Opcional: abre o navegador automaticamente ao rodar npm run dev
        open: true,
    },

    build: {
        // Garante que o build final seja limpo e otimizado
        outDir: 'dist',
        assetsDir: 'assets',
    }
})