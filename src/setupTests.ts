import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

// jsdom has no showModal(), so these stand-ins act like a browser.
HTMLDialogElement.prototype.showModal = function () {
  this.open = true
  this.querySelector<HTMLButtonElement>('button')?.focus()
}
HTMLDialogElement.prototype.close = function () {
  this.open = false
}
