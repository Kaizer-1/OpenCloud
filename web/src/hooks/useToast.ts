import * as React from 'react'

type ToastVariant = 'default' | 'destructive'

interface ToastState {
  id: string
  title?: string
  description?: string
  variant?: ToastVariant
  open: boolean
}

type ToastAction =
  | { type: 'ADD'; toast: Omit<ToastState, 'id' | 'open'> }
  | { type: 'DISMISS'; id: string }
  | { type: 'REMOVE'; id: string }

let count = 0
const listeners: Array<(state: ToastState[]) => void> = []
let toasts: ToastState[] = []

function dispatch(action: ToastAction) {
  switch (action.type) {
    case 'ADD':
      toasts = [...toasts, { ...action.toast, id: String(++count), open: true }]
      break
    case 'DISMISS':
      toasts = toasts.map((t) => (t.id === action.id ? { ...t, open: false } : t))
      setTimeout(() => dispatch({ type: 'REMOVE', id: action.id }), 300)
      break
    case 'REMOVE':
      toasts = toasts.filter((t) => t.id !== action.id)
      break
  }
  listeners.forEach((l) => l(toasts))
}

export function toast(props: Omit<ToastState, 'id' | 'open'>) {
  dispatch({ type: 'ADD', toast: props })
  const id = String(count)
  setTimeout(() => dispatch({ type: 'DISMISS', id }), 4000)
}

export function useToast() {
  const [state, setState] = React.useState<ToastState[]>(toasts)
  React.useEffect(() => {
    listeners.push(setState)
    return () => {
      const i = listeners.indexOf(setState)
      if (i > -1) listeners.splice(i, 1)
    }
  }, [])
  return {
    toasts: state,
    toast,
    dismiss: (id: string) => dispatch({ type: 'DISMISS', id }),
  }
}
