import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";

// Configurar cliente Convex con opciones de conexión más robustas
const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string, {
  // Configuración de WebSocket más estable
  webSocketConstructor: typeof WebSocket !== "undefined" ? WebSocket : undefined,
  // Configuración de reconexión automática más agresiva
  unsavedChangesWarning: false,
  // Configuración de timeouts más largos para operaciones de IA
  verbose: import.meta.env.DEV,
  // Configuración adicional para estabilidad
  skipConvexDeploymentUrlCheck: false,
});

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <App />
  </ConvexAuthProvider>,
);
