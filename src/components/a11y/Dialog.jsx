import { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import useFocusTrap, { useInertSiblings } from '../../hooks/useFocusTrap';

/**
 * Accessible dialog wrapper.
 *
 * Why this exists: many of our modals (LoginModal, SupportChat, chat
 * drawers, store overlays...) hand-rolled their own overlay markup and were
 * missing one or more of: `role="dialog"`, `aria-modal`, focus trap,
 * Escape-to-close, focus restoration, or backdrop dismissal. This component
 * centralises those concerns so each consumer only worries about its own
 * content.
 *
 * Props:
 *  - `open`            : boolean controlling visibility
 *  - `onClose`         : callback invoked on Escape and (optionally) backdrop click
 *  - `labelledBy`      : id of the element that titles the dialog (required for SR name)
 *  - `describedBy`     : optional id for the descriptive paragraph
 *  - `initialFocusRef` : optional ref to receive initial focus (defaults to first focusable)
 *  - `closeOnBackdrop` : default true
 *  - `className`       : applied to the *backdrop* container
 *  - `panelClassName`  : applied to the *panel* (the focusable surface itself)
 *  - `panelRef`        : optional external ref to the panel element
 *  - `role`            : defaults to "dialog"; pass "alertdialog" when appropriate
 *  - `inertSiblings`   : default true — mark sibling DOM as `inert` while open
 */
export default function Dialog({
  open,
  onClose,
  labelledBy,
  describedBy,
  initialFocusRef,
  closeOnBackdrop = true,
  className = '',
  panelClassName = '',
  panelRef: externalPanelRef,
  role = 'dialog',
  inertSiblings = true,
  children,
}) {
  const internalPanelRef = useRef(null);
  const panelRef = externalPanelRef || internalPanelRef;
  const hostRef = useRef(null);
  const generatedId = useId();
  const fallbackTitleId = `${generatedId}-title`;

  useFocusTrap(panelRef, !!open, {
    initialFocus: initialFocusRef ? () => initialFocusRef.current : null,
  });

  useInertSiblings(hostRef, !!(open && inertSiblings));

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose?.();
      }
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  const handleBackdropClick = (e) => {
    if (!closeOnBackdrop) return;
    if (e.target === e.currentTarget) onClose?.();
  };

  return createPortal(
    <div
      ref={hostRef}
      className={className}
      onClick={handleBackdropClick}
      data-a11y-dialog-host
    >
      <div
        ref={panelRef}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy || fallbackTitleId}
        aria-describedby={describedBy || undefined}
        tabIndex={-1}
        className={panelClassName}
      >
        {children}
      </div>
    </div>,
    document.body
  );
}
