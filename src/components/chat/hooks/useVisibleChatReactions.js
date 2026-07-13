import { useEffect, useState, useRef, useCallback } from 'react';
import { subscribeReactions } from '../../../firebase/liveChat';

const MAX_TRACKED_MESSAGE_IDS = 40;
const SCROLL_DEBOUNCE_MS = 100;

/**
 * One Firestore listener per tracked message id (capped). Subscriptions follow the virtual
 * list; scroll updates are debounced to avoid listener churn.
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
    setReactionsByMessageId({});
    const unsubs = ids.map((id) =>
      subscribeReactions(roomId, id, (reactions) => {
        setReactionsByMessageId((prev) => ({ ...prev, [id]: reactions }));
      })
    );
    return () => {
      unsubs.forEach((u) => u());
    };
  }, [roomId, trackedKey]);

  return reactionsByMessageId;
}
