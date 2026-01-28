// vite.config.js
export default {
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      external: ['https://unpkg.com/@supabase/supabase-js@2'], // 明确排除
      output: {
        manualChunks: undefined // 禁用 manualChunks
      }
    }
  },
  optimizeDeps: {
    exclude: ['@supabase/supabase-js'] // 排除优化
  }
}
