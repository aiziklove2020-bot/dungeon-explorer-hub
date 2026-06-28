// Tiny dev-friendly logger. Centralizes error/warn output so we can
// later swap in a real sink (Sentry, console-only in dev, etc.) from one place.
// In production we still log warnings/errors to console so they show in
// browser devtools and can be captured by tooling, but suppress info/debug.

const isProd = (() => {
  try {
    return import.meta?.env?.PROD === true;
  } catch (_) {
    return false;
  }
})();

const fmt = (scope, args) => (scope ? [`[TBDSM:${scope}]`, ...args] : ['[TBDSM]', ...args]);

export const logError = (scope, ...args) => {
  if (typeof console === 'undefined' || !console.error) return;
  console.error(...fmt(scope, args));
};

export const logWarn = (scope, ...args) => {
  if (typeof console === 'undefined' || !console.warn) return;
  console.warn(...fmt(scope, args));
};

export const logInfo = (scope, ...args) => {
  if (isProd) return;
  if (typeof console === 'undefined' || !console.info) return;
  console.info(...fmt(scope, args));
};

export const logDebug = (scope, ...args) => {
  if (isProd) return;
  if (typeof console === 'undefined' || !console.debug) return;
  console.debug(...fmt(scope, args));
};

export default { logError, logWarn, logInfo, logDebug };
