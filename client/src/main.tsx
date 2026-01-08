import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Service Worker registration removed
// if ("serviceWorker" in navigator && import.meta.env.PROD) { ... }

createRoot(document.getElementById("root")!).render(<App />);
