import { useEffect, useRef, type ReactNode } from 'react'
import './Modal.css'

interface ModalProps {
  open: boolean
  title?: string
  children: ReactNode
  onClose: () => void
  className?: string
}

export function Modal({ open, title, children, onClose, className = '' }: Readonly<ModalProps>) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    const dialogElement = dialogRef.current
    if (!dialogElement) return
    const focusableSelector = [
      'button:not([disabled])',
      '[href]',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',')
    const focusable = () => Array.from(dialogElement.querySelectorAll<HTMLElement>(focusableSelector))
      .filter((element) => !element.classList.contains('ui-modal__close'))
    const firstFocusable = focusable()[0]
    firstFocusable?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
        return
      }
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (elements.length === 0) {
        event.preventDefault()
        dialogRef.current?.focus()
        return
      }
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, open])

  if (!open) return null

  return (
    <div className="ui-modal__overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <div
        ref={dialogRef}
        className={`ui-modal${className ? ` ${className}` : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'ui-modal-title' : undefined}
        tabIndex={-1}
      >
        {title && (
          <div className="ui-modal__header">
            <h2 id="ui-modal-title">{title}</h2>
            <button className="ui-modal__close" type="button" aria-label="Cerrar" onClick={onClose}>×</button>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}