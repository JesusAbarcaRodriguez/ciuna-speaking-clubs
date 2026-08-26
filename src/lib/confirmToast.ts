import { toast } from 'sonner';

export function confirmToast(message: string, onConfirm: () => void, confirmLabel = 'Eliminar') {
  toast(message, {
    duration: 8000,
    action: {
      label: confirmLabel,
      onClick: onConfirm,
    },
    cancel: {
      label: 'Cancelar',
      onClick: () => {},
    },
  });
}
