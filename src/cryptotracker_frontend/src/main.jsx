import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';

// Client-side redirect from .html URLs to clean routes
const htmlToRouteMap = {
  '/index.html': '/home',
  '/ai.html': '/ai',
  '/browse.html': '/browse',
  '/dash.html': '/dash',
  '/notes.html': '/notes',
  '/plinko.html': '/plinko',
  '/roadmap.html': '/roadmap',
  '/shorts.html': '/shorts',
  '/skibidi.html': '/community',
  '/tetris.html': '/tetris',
  '/track.html': '/tracker'
};

const currentPath = window.location.pathname;
if (htmlToRouteMap[currentPath]) {
  window.history.replaceState(null, '', htmlToRouteMap[currentPath]);
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
