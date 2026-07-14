import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';
import { renderHook } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  isEditMode: vi.fn(() => true),
  batchSet: vi.fn(),
  batchCommit: vi.fn().mockResolvedValue(undefined),
  doc: vi.fn((_db, _coll, name) => ({ name })),
  logError: vi.fn(),
}));

vi.mock('../../services/contentService', () => ({
  isEditMode: mocks.isEditMode,
}));

vi.mock('firebase/firestore', () => ({
  doc: mocks.doc,
  writeBatch: vi.fn(() => ({ set: mocks.batchSet, commit: mocks.batchCommit })),
}));

vi.mock('../../firebase/config', () => ({
  db: { __mockFirestore: true },
}));

vi.mock('../../utils/logger', () => ({
  logError: mocks.logError,
}));

// Fake-timers + dynamic import()s inside a setTimeout callback interact
// poorly in vitest — the import()s inside the scheduled callback don't get
// enough microtask turns. Use real timers and shorten the debounce to keep
// the suite fast.
const { useContentAutosave, setAutosaveDebounceMs } = await import('./useContentAutosave');
setAutosaveDebounceMs(20);
afterAll(() => setAutosaveDebounceMs(3000));

const baseContent = () => ({
  hero: { title: 'A' },
  about: { text: 'B' },
  contact: { phone: '050' },
  registration: { enabled: true },
  socialLinks: [{ type: 'instagram', url: 'https://x' }],
  whatsappGroups: { men: 'https://w' },
});

async function waitUntil(predicate, { timeoutMs = 500 } = {}) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, 5));
  }
}

beforeEach(() => {
  mocks.isEditMode.mockImplementation(() => true);
  mocks.batchSet.mockClear();
  mocks.batchCommit.mockClear();
  mocks.batchCommit.mockResolvedValue(undefined);
  mocks.logError.mockClear();
});

describe('useContentAutosave', () => {
  it('does nothing when not yet initialized', async () => {
    const content = baseContent();
    renderHook(() => useContentAutosave(content, false));
    await new Promise((r) => setTimeout(r, 80));
    expect(mocks.batchCommit).not.toHaveBeenCalled();
  });

  it('does nothing when edit mode is off', async () => {
    mocks.isEditMode.mockImplementation(() => false);
    const content = baseContent();
    renderHook(() => useContentAutosave(content, true));
    await new Promise((r) => setTimeout(r, 80));
    expect(mocks.batchCommit).not.toHaveBeenCalled();
  });

  it('does not commit on first render (baseline snapshot only)', async () => {
    const content = baseContent();
    renderHook(() => useContentAutosave(content, true));
    await new Promise((r) => setTimeout(r, 80));
    expect(mocks.batchCommit).not.toHaveBeenCalled();
  });

  it('debounces and commits four settings docs when hero changes', async () => {
    const initial = baseContent();
    const { rerender } = renderHook(({ content }) => useContentAutosave(content, true), {
      initialProps: { content: initial },
    });

    rerender({ content: { ...initial, hero: { title: 'New' } } });

    await waitUntil(() => mocks.batchCommit.mock.calls.length > 0);

    expect(mocks.batchCommit).toHaveBeenCalledTimes(1);
    expect(mocks.batchSet).toHaveBeenCalledTimes(4);

    const targets = mocks.batchSet.mock.calls.map(([ref]) => ref.name);
    expect(targets).toEqual([
      'content',
      'registrationSettings',
      'socialLinks',
      'whatsappGroups',
    ]);
  });

  it('skips commit when an unrelated update does not touch tracked sections', async () => {
    const initial = baseContent();
    const { rerender } = renderHook(({ content }) => useContentAutosave(content, true), {
      initialProps: { content: initial },
    });

    rerender({ content: { ...initial, events: [{ id: 'x' }] } });

    await new Promise((r) => setTimeout(r, 80));
    expect(mocks.batchCommit).not.toHaveBeenCalled();
  });

  it('swallows commit errors via logError (never throws)', async () => {
    mocks.batchCommit.mockRejectedValueOnce(new Error('firestore down'));

    const initial = baseContent();
    const { rerender } = renderHook(({ content }) => useContentAutosave(content, true), {
      initialProps: { content: initial },
    });

    rerender({ content: { ...initial, hero: { title: 'Z' } } });

    await waitUntil(() => mocks.logError.mock.calls.length > 0);

    expect(mocks.logError).toHaveBeenCalledTimes(1);
    expect(mocks.logError).toHaveBeenCalledWith('Content.autosave', expect.any(Error));
  });
});
