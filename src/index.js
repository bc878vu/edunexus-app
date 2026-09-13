import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import ModernApp from './ModernApp';
import { SEOManager, SeoRouteBridge } from './SEO';

function AppRoot() {
  return (
    <>
      <SEOManager />
      <SeoRouteBridge />
      <ModernApp />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppRoot />
  </React.StrictMode>
);
