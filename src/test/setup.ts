import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'
import { mockServer } from '@/services/mockServer'

// jsdom has no <dialog> modal support yet. This is a minimal polyfill; real
// focus trapping is the browser's job and is checked in the browser.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute('open')
    this.dispatchEvent(new Event('close'))
  }
}

beforeEach(() => {
  mockServer.reset(new Date(2026, 10, 16, 9))
  mockServer.configure({ latencyMs: 0, failNext: null })
})

afterEach(() => {
  cleanup()
})
