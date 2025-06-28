import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import fs from 'fs';

function getHtmlFiles() {
  const srcDir = path.resolve(__dirname, 'src');
  const files = fs.readdirSync(srcDir);
  const htmlFiles = files.filter(file => file.endsWith('.html'));
  const input = {};
  htmlFiles.forEach(file => {
    input[file.replace('.html', '')] = path.resolve(srcDir, file);
  });
  return input;
}

export default defineConfig({
  plugins: [react()],
  root: 'src',
  base: '/',
  build: {
    outDir: '../dist',
    rollupOptions: {
      input: getHtmlFiles()
    },
    assetsInclude: ['**/*.css'],
    emptyOutDir: true,
    cssCodeSplit: true
  },
  server: {
    open: '/',
    // Add rewrite rules for clean URLs to corresponding HTML files
    historyApiFallback: {
      rewrites: [
        { from: /^\/home$/, to: '/index.html' },
        { from: /^\/ai$/, to: '/ai.html' },
        { from: /^\/browse$/, to: '/browse.html' },
        { from: /^\/dash$/, to: '/dash.html' },
        { from: /^\/notes$/, to: '/notes.html' },
        { from: /^\/plinko$/, to: '/plinko.html' },
        { from: /^\/roadmap$/, to: '/roadmap.html' },
        { from: /^\/shorts$/, to: '/shorts.html' },
        { from: /^\/skibidi$/, to: '/skibidi.html' },
        { from: /^\/tetris$/, to: '/tetris.html' },
        { from: /^\/track$/, to: '/track.html' }
      ]
    },
    // Middleware to redirect .html URLs to clean routes
    middlewareMode: true,
    setup: function (app) {
      const htmlToRouteMap = {
        '/index.html': '/home',
        '/ai.html': '/ai',
        '/browse.html': '/browse',
        '/dash.html': '/dashboard',
        '/notes.html': '/notes',
        '/plinko.html': '/plinko',
        '/roadmap.html': '/roadmap',
        '/shorts.html': '/shorts',
        '/skibidi.html': '/community',
        '/tetris.html': '/tetris',
        '/track.html': '/tracker'
      };
      app.use((req, res, next) => {
        const url = req.url;
        if (url.endsWith('.html') && htmlToRouteMap[url]) {
          const redirectUrl = htmlToRouteMap[url];
          res.writeHead(301, { Location: redirectUrl });
          res.end();
        } else {
          next();
        }
      });
    }
  }
});
