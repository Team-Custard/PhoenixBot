import { lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { Router, useRouter } from "./router.jsx";
import { ToastProvider } from "./components/Toasts.jsx";
import { Site } from "./site/Site.jsx";
// All the CSS is loaded up front (it's small); only the dashboard's code is split off.
import "./styles.css";
import "./site/site.css";

const Dashboard = lazy(() => import("./App.jsx").then((m) => ({ default: m.App })));

function Root() {
  const { path } = useRouter();
  if (path === "/dash" || path.startsWith("/dash/")) {
    return (
      <Suspense fallback={<main className="center-stage"><div className="spinner" aria-label="Loading" /></main>}>
        <Dashboard />
      </Suspense>
    );
  }
  return <Site />;
}

createRoot(document.getElementById("root")).render(
  <Router>
    <ToastProvider>
      <Root />
    </ToastProvider>
  </Router>,
);
