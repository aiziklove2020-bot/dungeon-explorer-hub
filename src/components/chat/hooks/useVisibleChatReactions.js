import { useEffect, useState, useRef, useCallback } from 'react';
import { fetchReactions } from '../../../firebase/liveChat';

const MAX_TRACKED_MESSAGE_IDS = 40;
const SCROLL_DEBOUNCE_MS = 100;
const POLL_MS = 8000;

/**
 * Polls reactions for visible messages instead of opening one live Firestore
 * listener per message. With up to 40 tracked messages, one listener each
 * meant up to 40 concurrent realtime channels per open chat tab — the
 * browser's long-polling transport made that CPU-heavy enough to freeze the
 * whole page. Polling on an interval bounds this to periodic one-shot reads.
 */
export function useVisibleChatReactions(roomId, scrollElRef, getVisibleMessageIdsRef, listEpoch) {
  const [trackedKey, setTrackedKey] = useState('');
  const [reactionsByMessageId, setReactionsByMessageId] = useState({});
  const debRef = useRef(null);

  const computeTrackedKey = useCallback(() => {
    if (!roomId) return;
    const raw = getVisibleMessageIdsRef.current?.() || [];
    const uniq = [...new Set(raw)].slice(0, MAX_TRACKED_MESSAGE_IDS).sort();
    const next = uniq.join('|');
    setTrackedKey((prev) => (prev === next ? prev : next));
  }, [roomId, getVisibleMessageIdsRef]);

  useEffect(() => {
    if (!roomId) {
      setTrackedKey('');
      return;
    }
    computeTrackedKey();
  }, [roomId, listEpoch, computeTrackedKey]);

  useEffect(() => {
    const el = scrollElRef?.current;
    if (!el || !roomId) return () => {};
    const onScroll = () => {
      if (debRef.current) clearTimeout(debRef.current);
      debRef.current = setTimeout(() => {
        debRef.current = null;
        computeTrackedKey();
      }, SCROLL_DEBOUNCE_MS);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(onScroll) : null;
    if (ro) ro.observe(el);
    return () => {
      el.removeEventListener('scroll', onScroll);
      if (ro) ro.disconnect();
      if (debRef.current) clearTimeout(debRef.current);
    };
  }, [roomId, scrollElRef, computeTrackedKey]);

  useEffect(() => {
    if (!roomId || !trackedKey) {
      setReactionsByMessageId({});
      return;
    }
    const ids = trackedKey.split('|').filter(Boolean);
    let cancelled = false;

    const load = async () => {
      const entries = await Promise.all(
        ids.map(async (id) => [id, await fetchReactions(roomId, id).catch(() => [])])
      );
      if (cancelled) return;
      setReactionsByMessageId(Object.fromEntries(entries));
    };

    load();
    const poll = setInterval(load, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(poll);
    };
  }, [roomId, trackedKey]);

  return reactionsByMessageId;
}
