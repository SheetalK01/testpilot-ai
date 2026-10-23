import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import Button from './Button';
import Modal from './Modal';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Delete',
}) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? () => {} : onClose} title={title} size="sm">
      <div className="flex gap-4">
        <div className="grid size-10 shrink-0 place-items-center rounded-full bg-danger-soft text-danger">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </div>
        <p className="text-sm leading-relaxed text-muted">{message}</p>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose} disabled={busy} data-autofocus>
          Cancel
        </Button>
        <Button variant="danger" onClick={confirm} loading={busy} data-testid="confirm-delete">
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  );
}
