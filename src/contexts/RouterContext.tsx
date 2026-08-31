import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

interface RouterContextType {
  path: string;
  pushPath: (newPath: string) => void;
  replacePath: (newPath: string) => void;
  query: Record<string, string>;
}

const normalizePath = (pathname: string): string => {
  if (!pathname || pathname === '') return '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  return pathname;
};

const getQueryParams = (): Record<string, string> => {
  if (typeof window === 'undefined') return {};
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  params.forEach((value, key) => {
    result[key] = value;
  });
  return result;
};

const defaultRouterState: RouterContextType = {
  path: typeof window !== 'undefined' ? normalizePath(window.location.pathname) : '/',
  pushPath: (newPath: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', newPath);
      window.dispatchEvent(new Event('popstate'));
    }
  },
  replacePath: (newPath: string) => {
    if (typeof window !== 'undefined') {
      window.history.replaceState({}, '', newPath);
      window.dispatchEvent(new Event('popstate'));
    }
  },
  query: typeof window !== 'undefined' ? getQueryParams() : {},
};

const RouterContext = createContext<RouterContextType>(defaultRouterState);

export const RouterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [path, setPath] = useState<string>(() => (typeof window !== 'undefined' ? normalizePath(window.location.pathname) : '/'));
  const [query, setQuery] = useState<Record<string, string>>(() => getQueryParams());

  const handleUrlChange = useCallback(() => {
    if (typeof window !== 'undefined') {
      setPath(normalizePath(window.location.pathname));
      setQuery(getQueryParams());
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, [handleUrlChange]);

  const pushPath = useCallback((newPath: string) => {
    if (typeof window === 'undefined') return;
    const normalized = normalizePath(newPath);
    if (window.location.pathname !== normalized) {
      window.history.pushState({}, '', newPath);
      setPath(normalized);
      setQuery(getQueryParams());
    }
  }, []);

  const replacePath = useCallback((newPath: string) => {
    if (typeof window === 'undefined') return;
    const normalized = normalizePath(newPath);
    window.history.replaceState({}, '', newPath);
    setPath(normalized);
    setQuery(getQueryParams());
  }, []);

  return (
    <RouterContext.Provider value={{ path, pushPath, replacePath, query }}>
      {children}
    </RouterContext.Provider>
  );
};

export const useRouter = (): RouterContextType => {
  const context = useContext(RouterContext);
  return context || defaultRouterState;
};
