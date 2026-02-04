import { defineConfig } from 'vite';

export default defineConfig(async () => {
  const { default: react } = await import('@vitejs/plugin-react');
  return {
    plugins: [react()],
    base: '/photobooth/',
    build: {
      outDir: './dist',
      emptyOutDir: true,
      rollupOptions: {
        output: {
          assetFileNames: (assetInfo) => {
            if (assetInfo.name.endsWith('.css')) {
              return 'assets/[name][extname]';
            }
            return 'assets/[name].[hash][extname]';
          },
          chunkFileNames: 'assets/[name].[hash].js',
          entryFileNames: 'assets/[name].[hash].js',
        }
      }
    },
    publicDir: 'public', // Ensure public directory is copied
  };
});