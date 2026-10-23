import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Loads data for the given dependency key and cancels stale requests.
 * Returns { data, error, loading, reload, setData }. Data from the previous load is kept while
 * reloading, so screens can refresh without flashing back to skeletons.
 */
export function useResource(loader, deps) {
  const loaderRef = useRef(loader);
  const [version, setVersion] = useState(0);
  const key = `${JSON.stringify(deps)}#${version}`;
  const [state, setState] = useState({ key: null, data: undefined, error: null });

  useEffect(() => {
    loaderRef.current = loader;
  });

  useEffect(() => {
    const controller = new AbortController();
    loaderRef.current(controller.signal).then(
      (data) => setState({ key, data, error: null }),
      (error) => {
        if (error.name !== 'AbortError') setState({ key, data: undefined, error });
      },
    );
    return () => controller.abort();
  }, [key]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);
  const setData = useCallback(
    (update) =>
      setState((current) => ({
        ...current,
        data: typeof update === 'function' ? update(current.data) : update,
      })),
    [],
  );

  return { data: state.data, error: state.error, loading: state.key !== key, reload, setData };
}
