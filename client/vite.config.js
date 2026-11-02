import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// Proxy API and socket traffic to the Express server so cookies stay same-origin in dev.
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: { '@': '/src' },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true,
            },
            '/socket.io': {
                target: 'http://localhost:4000',
                changeOrigin: true,
                ws: true,
            },
        },
    },
});
