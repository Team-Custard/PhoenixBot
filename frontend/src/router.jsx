// A tiny history-based router: the dashboard only has a handful of routes.
import { createContext, useCallback, useContext, useEffect, useState } from "react";

const RouterContext = createContext(null);

export function Router({ children }) {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((to, { replace = false } = {}) => {
    if (to === window.location.pathname) return;
    window.history[replace ? "replaceState" : "pushState"]({}, "", to);
    setPath(to);
    window.scrollTo(0, 0);
  }, []);

  return <RouterContext.Provider value={{ path, navigate }}>{children}</RouterContext.Provider>;
}

export function useRouter() {
  return useContext(RouterContext);
}

/** An <a> that navigates without reloading the page. */
export function Link({ to, children, onClick, ...props }) {
  const { navigate } = useRouter();
  return (
    <a
      href={to}
      onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0) return;
        event.preventDefault();
        navigate(to);
      }}
      {...props}
    >
      {children}
    </a>
  );
}

/** Matches "/dash/:guildId/:section" style patterns. */
export function matchPath(pattern, path) {
  const patternParts = pattern.split("/").filter(Boolean);
  const pathParts = path.split("/").filter(Boolean);
  const params = {};
  for (let i = 0; i < patternParts.length; i++) {
    const part = patternParts[i];
    const optional = part.endsWith("?");
    const name = part.replace(/^:|\?$/g, "");
    if (part.startsWith(":")) {
      if (pathParts[i] === undefined) {
        if (optional) continue;
        return null;
      }
      try {
        params[name] = decodeURIComponent(pathParts[i]);
      }
      catch {
        return null;
      }
    }
    else if (part !== pathParts[i]) return null;
  }
  if (pathParts.length > patternParts.length) return null;
  return params;
}
