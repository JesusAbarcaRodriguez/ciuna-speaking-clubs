import { useCallback, useState } from 'react';

interface ConfirmState {
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
}

export function useConfirmDialog() {
  const [state, setState] = useState<ConfirmState | null>(null);

  const requestConfirm = useCallback(
    (message: string, onConfirm: () => void, confirmLabel?: string) => {
      setState({ message, onConfirm, confirmLabel });
    },
    [],
  );

  const close = useCallback(() => setState(null), []);

  const handleConfirm = useCallback(() => {
    state?.onConfirm();
    close();
  }, [state, close]);

  return {
    dialogProps: {
      open: state !== null,
      message: state?.message ?? '',
      confirmLabel: state?.confirmLabel,
      onConfirm: handleConfirm,
      onCancel: close,
    },
    requestConfirm,
  };
}
