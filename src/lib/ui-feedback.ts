/**
 * App-wide confirm dialogs and toasts.
 *
 * `confirmAction` replaces `window.confirm` with the app's RTL dialog and
 * `toast` replaces `window.alert` and one-off banners. Both work from any
 * event handler; `FeedbackHost` (mounted by the root layout) renders them.
 * When no host is mounted they fall back to the native browser dialogs.
 */

export type ConfirmTone = 'danger' | 'default'

export interface ConfirmOptions {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

export interface ConfirmRequest extends Required<Omit<ConfirmOptions, 'title'>> {
  id: number
  title: string
  resolve: (confirmed: boolean) => void
}

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  title?: string
  tone?: ToastTone
  /** Milliseconds before auto-dismiss; 0 keeps it until dismissed. */
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

export interface ToastItem {
  id: number
  message: string
  title?: string
  tone: ToastTone
  duration: number
  actionLabel?: string
  onAction?: () => void
}

interface FeedbackState {
  confirms: ConfirmRequest[]
  toasts: ToastItem[]
}

let state: FeedbackState = { confirms: [], toasts: [] }
let nextId = 1
let hostMounted = 0
const listeners = new Set<(next: FeedbackState) => void>()

function emit(next: FeedbackState) {
  state = next
  listeners.forEach(listener => listener(state))
}

export function subscribeFeedback(listener: (next: FeedbackState) => void) {
  listeners.add(listener)
  hostMounted += 1
  listener(state)
  return () => {
    listeners.delete(listener)
    hostMounted -= 1
  }
}

export function confirmAction(input: string | ConfirmOptions): Promise<boolean> {
  const options: ConfirmOptions = typeof input === 'string' ? { message: input } : input
  if (hostMounted === 0) {
    return Promise.resolve(typeof window !== 'undefined' && window.confirm(options.message))
  }
  return new Promise(resolve => {
    const request: ConfirmRequest = {
      id: nextId++,
      title: options.title || 'تأكيد الإجراء',
      message: options.message,
      confirmLabel: options.confirmLabel || 'متابعة',
      // "إلغاء" on the cancel button is ambiguous when the action itself cancels something.
      cancelLabel: options.cancelLabel || (/^\s*إلغاء/.test(`${options.title || ''}${options.message}`) ? 'تراجع' : 'إلغاء'),
      tone: options.tone || 'danger',
      resolve: (confirmed) => {
        emit({ ...state, confirms: state.confirms.filter(item => item.id !== request.id) })
        resolve(confirmed)
      },
    }
    emit({ ...state, confirms: [...state.confirms, request] })
  })
}

export function dismissToast(id: number) {
  emit({ ...state, toasts: state.toasts.filter(item => item.id !== id) })
}

export function toast(message: string, options: ToastOptions = {}) {
  const tone = options.tone || 'info'
  if (hostMounted === 0) {
    if (typeof window !== 'undefined' && tone === 'error') window.alert(message)
    return 0
  }
  const item: ToastItem = {
    id: nextId++,
    message,
    title: options.title,
    tone,
    duration: options.duration ?? (tone === 'error' ? 7000 : 4000),
    actionLabel: options.actionLabel,
    onAction: options.onAction,
  }
  emit({ ...state, toasts: [...state.toasts.slice(-3), item] })
  return item.id
}
