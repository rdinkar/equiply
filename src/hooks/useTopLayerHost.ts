import { useLayoutEffect, useState } from 'react'

function findHost(): HTMLElement {
  const open = document.querySelectorAll<HTMLDialogElement>('dialog[open]')
  return open[open.length - 1] ?? document.body
}

/**
 * The element floating UI (toasts) should render into: the topmost open modal
 * <dialog>, else <body>. Modal dialogs live in the browser's top layer and make
 * everything outside them inert, so a toast rendered in <body> would be covered
 * by an open drawer and its live region would be ignored by screen readers.
 */
export function useTopLayerHost(): HTMLElement | null {
  const [host, setHost] = useState<HTMLElement | null>(null)

  useLayoutEffect(() => {
    const update = () => setHost(findHost())
    update()
    const observer = new MutationObserver(update)
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['open'] })
    return () => observer.disconnect()
  }, [])

  return host
}
