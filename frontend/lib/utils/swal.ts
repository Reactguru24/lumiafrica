import Swal from 'sweetalert2'

type ConfirmOptions = {
  title: string
  text?: string
  confirmText?: string
  cancelText?: string
  icon?: 'warning' | 'question' | 'info' | 'error'
}

function isDarkMode(): boolean {
  if (typeof document === 'undefined') return true
  return document.documentElement.classList.contains('dark')
}

export async function confirmAction({
  title,
  text,
  confirmText = 'Yes, continue',
  cancelText = 'Cancel',
  icon = 'warning',
}: ConfirmOptions): Promise<boolean> {
  const dark = isDarkMode()
  const result = await Swal.fire({
    title,
    text,
    icon,
    showCancelButton: true,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    confirmButtonColor: '#0e4d5f',
    cancelButtonColor: dark ? '#4b5563' : '#6b7280',
    reverseButtons: true,
    focusCancel: true,
    background: dark ? '#1f2937' : '#ffffff',
    color: dark ? '#f9fafb' : '#1f2929',
    customClass: {
      popup: 'swal-popup',
      title: dark ? 'swal-title-dark' : 'swal-title-light',
      htmlContainer: dark ? 'swal-html-dark' : 'swal-html-light',
      confirmButton: dark ? 'swal-btn-dark' : 'swal-btn-light',
      cancelButton: dark ? 'swal-btn-dark' : 'swal-btn-light',
    },
  })
  return result.isConfirmed
}
