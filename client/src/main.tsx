import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Register service worker for PWA
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    const basePath = import.meta.env.BASE_URL || '/trace-classroom-crm/';
    const swPath = `${basePath}service-worker.js`.replace(/\/\//g, '/');
    
    navigator.serviceWorker.register(swPath)
      .then((registration) => {
        console.log('Service Worker registered:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
