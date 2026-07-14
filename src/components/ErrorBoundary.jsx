import { Component } from 'react';
import { logError } from '../utils/logger';
import { getTranslation } from '../i18n/translations';

// Class-based ErrorBoundary because hooks cannot replace getDerivedStateFromError
// / componentDidCatch yet. Catches render-phase errors below it and shows a
// fallback UI so the whole app does not unmount on a single broken page.
//
// Usage:
//   <ErrorBoundary scope="routes" onReset={...}><Routes>...</Routes></ErrorBoundary>
//
// Optional `fallback` prop accepts either a React node or a function:
//   fallback={({ error, reset }) => <MyError ... />}

// After a Vercel deploy, an open tab still references the OLD index.html
// chunk hashes (e.g. /assets/Chat-DPH-hLfo.js). The new deploy has different
// hashes, so the old assets 404 and Vercel's SPA fallback returns index.html
// with text/html MIME — which the browser refuses as a module. The user-
// visible symptom is "Failed to fetch dynamically imported module" thrown
// from a React.lazy() boundary.
//
// We auto-reload once per session on this specific error class so the tab
// picks up the new index.html and its current chunk hashes. The session
// flag prevents an infinite reload loop if the reload itself fails (e.g.
// the user is offline).
const CHUNK_RELOAD_FLAG = 'tbdsm_chunk_reload_at';
const CHUNK_RELOAD_COOLDOWN_MS = 30_000;

function isChunkLoadError(error) {
  if (!error) return false;
  if (error.name === 'ChunkLoadError') return true;
  const msg = String(error.message || error || '');
  return (
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Loading chunk \d+ failed/i.test(msg) ||
    /MIME type of "text\/html"/i.test(msg)
  );
}

function maybeAutoReloadForChunkError(error) {
  if (typeof window === 'undefined') return false;
  if (!isChunkLoadError(error)) return false;
  let last = 0;
  try {
    last = Number(sessionStorage.getItem(CHUNK_RELOAD_FLAG)) || 0;
  } catch { /* private mode etc. */ }
  if (Date.now() - last < CHUNK_RELOAD_COOLDOWN_MS) return false;
  try {
    sessionStorage.setItem(CHUNK_RELOAD_FLAG, String(Date.now()));
  } catch { /* ignore */ }
  // Force a network re-fetch of index.html so we don't get the stale
  // disk-cached one that points at the missing chunk.
  window.location.reload();
  return true;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
    this.handleReset = this.handleReset.bind(this);
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    logError(this.props.scope || 'ErrorBoundary', error, info?.componentStack);
    if (maybeAutoReloadForChunkError(error)) {
      // Reload triggered; render() will briefly show the fallback before
      // the page navigates. No further action needed.
    }
  }

  componentDidUpdate(prevProps) {
    // If a `resetKey` prop changes (e.g. route changes), reset the boundary so
    // navigating away from a broken page recovers without a full reload.
    if (this.state.error && prevProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null, info: null });
    }
  }

  handleReset() {
    this.setState({ error: null, info: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  }

  handleReload() {
    if (typeof window !== 'undefined') window.location.reload();
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (typeof this.props.fallback === 'function') {
      return this.props.fallback({ error, reset: this.handleReset });
    }
    if (this.props.fallback) return this.props.fallback;

    const title = getTranslation('error.boundaryTitle');
    const message = getTranslation('error.boundaryMessage');
    const tryAgain = getTranslation('error.tryAgain');
    const reload = getTranslation('error.reload');

    return (
      <div
        role="alert"
        aria-live="assertive"
        className="min-h-[60vh] flex items-center justify-center p-6"
        dir="rtl"
      >
        <div className="max-w-md w-full bg-zinc-900/70 border border-zinc-800 rounded-xl p-6 text-center">
          <h2 className="text-xl font-bold text-white mb-2">{title}</h2>
          <p className="text-zinc-400 text-sm mb-4">{message}</p>
          {import.meta.env?.DEV && (
            <pre className="text-xs text-red-400 bg-black/40 rounded p-2 mb-4 overflow-auto text-left" dir="ltr">
              {String(error?.message || error)}
            </pre>
          )}
          <div className="flex gap-2 justify-center">
            <button
              type="button"
              onClick={this.handleReset}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-xl font-bold text-sm"
            >
              {tryAgain}
            </button>
            <button
              type="button"
              onClick={this.handleReload}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-xl font-bold text-sm"
            >
              {reload}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
