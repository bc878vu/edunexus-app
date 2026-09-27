import React, { useCallback, useState } from 'react';

/**
 * In-page confirmation modal that replaces native window.confirm().
 *
 * Browser automation auto-dismisses native dialogs (confirm() returns false),
 * so admin actions (Disable, Delete, etc.) silently fail when driven by
 * automation. This in-page modal works identically in human browsers and in
 * automated browsers.
 *
 * Usage:
 *   import { useConfirm } from './ConfirmDialog';
 *
 *   function MyAdmin() {
 *     const { requestConfirm, ConfirmUI } = useConfirm();
 *
 *     const handleDelete = (item) => {
 *       requestConfirm({
 *         message: 'Permanently delete "' + item.name + '"?',
 *         confirmLabel: 'Delete',   // optional, defaults to 'Confirm'
 *         danger: true,             // optional, red confirm button
 *         onConfirm: async () => {
 *           await deleteDoc(doc(db, 'items', item.id));
 *         },
 *       });
 *     };
 *
 *     return (
 *       <div>
 *         <button onClick={() => handleDelete(item)}>Delete</button>
 *         <ConfirmUI />
 *       </div>
 *     );
 *   }
 */

export function ConfirmDialog({ message, confirmLabel, danger, busy, onConfirm, onCancel }) {
  return (
    <div role="alertdialog" aria-modal="true" aria-label="Confirm action" style={{
      position: 'fixed', inset: 0, zIndex: 9999, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'rgba(15, 23, 42, 0.55)', padding: 16,
    }}>
      <div style={{
        background: '#ffffff', color: '#0f172a', borderRadius: 12,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
        maxWidth: 440, width: '100%', padding: 24,
      }}>
        <p style={{ margin: '0 0 20px 0', fontSize: 15, lineHeight: 1.55, fontWeight: 500 }}>{message}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            style={{
              border: 'none', borderRadius: 8, padding: '10px 20px',
              fontSize: 14, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
              background: danger ? '#dc2626' : '#4c4fe0', color: '#ffffff',
              opacity: busy ? 0.6 : 1,
            }}
          >
            {busy ? 'Working…' : (confirmLabel || 'Confirm')}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            style={{
              border: 'none', borderRadius: 8, padding: '10px 20px',
              fontSize: 14, fontWeight: 600, cursor: busy ? 'not-allowed' : 'pointer',
              background: '#e2e8f0', color: '#0f172a',
              opacity: busy ? 0.6 : 1,
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function useConfirm() {
  const [pending, setPending] = useState(null);
  const [busy, setBusy] = useState(false);

  const requestConfirm = useCallback(({ message, onConfirm, confirmLabel, danger }) => {
    if (!message || typeof onConfirm !== 'function') return;
    setPending({ message, onConfirm, confirmLabel: confirmLabel || 'Confirm', danger: !!danger });
  }, []);

  const cancel = useCallback(() => {
    if (busy) return;
    setPending(null);
  }, [busy]);

  const confirm = useCallback(async () => {
    if (!pending || busy) return;
    setBusy(true);
    try {
      await pending.onConfirm();
    } finally {
      setBusy(false);
      setPending(null);
    }
  }, [pending, busy]);

  const ConfirmUI = useCallback(() => {
    if (!pending) return null;
    return (
      <ConfirmDialog
        message={pending.message}
        confirmLabel={pending.confirmLabel}
        danger={pending.danger}
        busy={busy}
        onConfirm={confirm}
        onCancel={cancel}
      />
    );
  }, [pending, busy, confirm, cancel]);

  return { pendingConfirm: pending, requestConfirm, ConfirmUI };
}

export default ConfirmDialog;
