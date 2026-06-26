import Swal from 'sweetalert2'

type ConfirmOptions = {
  title: string
  text?: string
  confirmText?: string
  cancelText?: string
  icon?: 'warning' | 'question' | 'info' | 'error'
}

export async function confirmAction({
  title,
  text,
  confirmText = 'Yes, continue',
  cancelText = 'Cancel',
  icon = 'warning',
}: ConfirmOptions): Promise<boolean> {
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: '#dc2626',
    cancelButtonColor: '#6b7280',
    reverseButtons: true,
    focusCancel: true,
  })
  return result.isConfirmed
}
