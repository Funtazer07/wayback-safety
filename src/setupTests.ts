import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(cleanup)

// jsdom has no native modal dialogs, so `<dialog>.showModal()` does not exist in tests. These
// stand-ins open and close the dialog and move the focus into it, as a browser does.
HTMLDialogElement.prototype.showModal = function () {
  this.open = true
  this.querySelector<HTMLButtonElement>('button')?.focus()
}
HTMLDialogElement.prototype.close = function () {
  this.open = false
}
