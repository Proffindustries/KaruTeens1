import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { compression } from 'vite-plugin-compression2';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // Enable React Compiler for better performance (React 19)
      babel: {
        plugins: []
      }
    }),
    
    // Gzip/Brotli compression for assets
    compression({
      algorithm: 'gzip',
      exclude: [/\.(br)$/, /\.(gz)$/]
    }),
    
    // Bundle analyzer (run with `npm run build:analyze`)
    mode === 'analyze' && visualizer({
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: 'dist/stats.html'
    }),
    
    // Progressive Web App support
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\./,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 24 * 60 * 60 // 24 hours
              }
            }
          }
        ]
      },
      manifest: {
        name: 'KaruTeens',
        short_name: 'KaruTeens',
        description: 'Connect, Learn, and Grow Together',
        theme_color: '#ff6b6b',
        background_color: '#f7f9fc',
        display: 'standalone',
        icons: [
          {
            src: '/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ].filter(Boolean),

  // Build optimization
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: mode !== 'production',
    rollupOptions: {
      output: {
        // Manual chunk splitting for optimal caching
        manualChunks: {
          // Core React ecosystem
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          
          // Data fetching & state management
          'vendor-query': ['@tanstack/react-query', 'axios'],
          
          // UI & Animation
          'vendor-ui': ['framer-motion', 'lucide-react'],
          
          // Real-time & utilities
          'vendor-realtime': ['ably'],
          
          // Math rendering (heavy, load separately)
          'vendor-math': ['katex', 'react-katex'],
          
          // Intersection Observer
          'vendor-observer': ['react-intersection-observer']
        },
        // Ensure chunks are reasonably sized
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return 'assets/images/[name]-[hash][extname]';
          }
          if (/\.(woff2?|ttf|otf|eot)$/i.test(assetInfo.name)) {
            return 'assets/fonts/[name]-[hash][extname]';
          }
          if (ext === 'css') {
            return 'assets/css/[name]-[hash][extname]';
          }
          return 'assets/[name]-[hash][extname]';
        }
      }
    },
    // Warn if chunks exceed 500KB
    chunkSizeWarningLimit: 500,
    // Minification options
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : []
      }
    }
  },

  // Development server configuration
  server: {
    port: 3000,
    strictPort: true,
    open: true,
    cors: true,
    // Proxy API requests during development
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, '')
      },
      '/ws': {
        target: process.env.VITE_WS_URL || 'ws://localhost:8000',
        ws: true
      }
    },
    // HMR configuration
    hmr: {
      overlay: true
    }
  },

  // Preview server (for testing production build)
  preview: {
    port: 4173,
    strictPort: true,
    open: true
  },

  // Resolve aliases for cleaner imports
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/components',
      '@pages': '/src/pages',
      '@hooks': '/src/hooks',
      '@utils': '/src/utils',
      '@context': '/src/context',
      '@api': '/src/api',
      '@assets': '/src/assets',
      '@styles': '/src/styles'
    }
  },

  // CSS configuration
  css: {
    devSourcemap: true,
    modules: {
      localsConvention: 'camelCase'
    },
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@styles/variables.scss";`
      }
    }
  },

  // Environment variable prefix
  envPrefix: 'VITE_',

  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@tanstack/react-query',
      'framer-motion',
      'lucide-react',
      'axios'
    ],
    exclude: ['katex'] // Heavy, load on demand
  },

  // Experimental features
  experimental: {
    // Enable CSS source maps in production
    cssSourceMap: true
  }
}));
