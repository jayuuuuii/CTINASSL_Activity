import { useState } from 'react';
import Modal from './Modal.jsx';

/** A yes/no dialog. `onConfirm` may return a promise; errors are shown in the dialog. */
export default function ConfirmDialog({ title, children, confirmLabel = 'Confirm', cancelLabel = 'Go back', danger = false, onConfirm, onClose, withReason = false, reasonLabel = 'Reason (optional)' }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [reason, setReason] = useState('');

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(reason.trim());
      onClose();
    } catch (e) {
      setError(e);
      setBusy(false);
    }
  }

  return (
    <Modal title={title} onClose={busy ? () => {} : onClose}>
      <div className="confirm">{children}</div>
      {withReason && (
        <div className="field">
          <label htmlFor="confirm-reason">{reasonLabel}</label>
          <textarea id="confirm-reason" rows="2" maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      )}
      {error && <p className="form-error">{error.message}</p>}
      <div className="form__actions">
        <button className="btn btn--outline" onClick={onClose} disabled={busy}>
          {cancelLabel}
        </button>
        <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`} onClick={confirm} disabled={busy}>
          {busy ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
