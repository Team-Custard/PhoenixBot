import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { Router } from "./router.jsx";
import { ToastProvider } from "./components/Toasts.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <Router>
    <ToastProvider>
      <App />
    </ToastProvider>
  </Router>,
);
