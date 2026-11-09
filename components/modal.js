// Modal (#102): a field with aria-haspopup="dialog" aria-controls="id" opens that <dialog class="modal"> with
// showModal(); .modal__close, Escape (native) and a click outside close it; the focus returns to the field (Safari does
// not focus a clicked button, so the browser alone would return it to the page). Components prepare their content on
// the bubbling events "modal-open" (before showModal), "modal-opened" (after, to place the focus) and "modal-close".
// dialog.opener is the field that opened it.

// A click on the overlay reaches the dialog itself, outside its box. It closes only when the press also started
// there, so selecting text inside and releasing outside keeps the dialog open.
const outside = (dialog, event) => {
  const box = dialog.getBoundingClientRect();
  return event.target === dialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom);
};
let pressedOutside = false;
document.addEventListener('pointerdown', (event) => {
  pressedOutside = event.target.matches?.('dialog.modal') && outside(event.target, event);
});

const emit = (dialog, name) => dialog.dispatchEvent(new CustomEvent(name, { bubbles: true }));

document.addEventListener('click', (event) => {
  if (event.target.matches?.('dialog.modal') && pressedOutside && outside(event.target, event)) {
    event.target.close();
    return;
  }
  const close = event.target.closest('dialog.modal .modal__close');
  if (close) {
    close.closest('dialog').close();
    return;
  }
  const opener = event.target.closest('[aria-haspopup="dialog"][aria-controls]');
  if (!opener) return;
  const dialog = document.getElementById(opener.getAttribute('aria-controls'));
  if (!dialog?.showModal || dialog.open) return;
  dialog.opener = opener;
  emit(dialog, 'modal-open');
  dialog.showModal();
  emit(dialog, 'modal-opened');
  dialog.addEventListener('close', () => {
    emit(dialog, 'modal-close');
    opener.focus();
  }, { once: true });
});
