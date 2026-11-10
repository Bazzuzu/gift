// Gift voucher form (#157): three steps in one card — the value and who it is for, the payment, thank you.
// Next and Pay check their step as the contact form does (#118): aria-invalid="true", the text under the field linked
// with aria-describedby, the focus on the first field with an error; a valid value removes the error as it is typed.
// A valid step opens the next one: the order is filled from step 1 (value, recipient), Pay shows the value; Back
// returns to step 1 with everything kept. The heading of the open step takes the focus, so a screen reader reads it.
// The picture of the card follows the chosen value (#161).
// The card number, the expiry date and the security code are typed as digits and shown in their template
// ("1234 1234 1234 1234", American Express "3782 822463 10005", "MM/YY"); the caret stays after the same digit.
// Paying is a mock: no card data leaves the page (page.js stops every form). Events are delegated: pages are inserted
// into index.html.

import { showError } from './contact-form.js';

const MESSAGES = {
  'recipient-name': 'Enter the recipient’s name',
  'recipient-email': 'Enter an email like name@example.com',
  email: 'Enter your email like name@example.com',
  'card-number': 'Enter the card number: 16 digits, 15 for American Express',
  'card-expiry': 'Enter the date like MM/YY',
  'card-csc': 'Enter the 3 or 4 digits from the card',
  'postal-code': 'Enter your ZIP code',
};

const digitsOf = (text) => text.replace(/\D/g, '');
const isAmex = (digits) => /^3[47]/.test(digits);

function templateOf(name, digits) {
  if (name === 'card-number') return isAmex(digits) ? 'XXXX XXXXXX XXXXX' : 'XXXX XXXX XXXX XXXX';
  if (name === 'card-expiry') return 'XX/XX';
  if (name === 'card-csc') return 'XXXX';
  return null;
}

// Digits into the template; a separator only before a digit that follows it.
function format(digits, template) {
  let out = '';
  let i = 0;
  for (const ch of template) {
    if (i === digits.length) break;
    out += ch === 'X' ? digits[i++] : ch;
  }
  return out;
}

// What is wrong with the value: '' when it is right.
function problem(control) {
  const value = control.value.trim();
  const message = MESSAGES[control.name] ?? '';
  if (!value) return control.required ? message : '';
  const digits = digitsOf(value);
  switch (control.name) {
    case 'card-number':
      return digits.length === (isAmex(digits) ? 15 : 16) ? '' : message;
    case 'card-expiry': {
      const match = /^(\d{2})\/(\d{2})$/.exec(value);
      const month = match ? Number(match[1]) : 0;
      if (month < 1 || month > 12) return message;
      const year = 2000 + Number(match[2]);
      const now = new Date();
      const expired = year < now.getFullYear() || (year === now.getFullYear() && month < now.getMonth() + 1);
      return expired ? 'The card has expired: check the date' : '';
    }
    case 'card-csc':
      return /^\d{3,4}$/.test(value) ? '' : message;
    default:
      return control.validity.valid ? '' : message;
  }
}

function show(card, name) {
  for (const step of card.querySelectorAll('.gift-form__step')) step.hidden = step.dataset.step !== name;
  card.querySelector(`.gift-form__step[data-step="${name}"] [tabindex="-1"]`)?.focus();
}

// The order of steps 2 and 3, from step 1.
function fillOrder(card) {
  const radio = card.querySelector('.choice__radio:checked');
  const amount = Number(radio?.value === 'custom' ? radio.dataset.amount : radio?.value); // own value — choice.js (#160)
  const value = Number.isFinite(amount) && amount > 0
    ? amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
    : '';
  const recipient = card.querySelector('.input__control[name="recipient-email"]').value.trim();
  for (const cell of card.querySelectorAll('[data-order="value"]')) cell.textContent = value || 'Custom';
  for (const cell of card.querySelectorAll('[data-order="recipient"]')) cell.textContent = recipient;
  const pay = card.querySelector('.gift-form__pay .button__label');
  if (pay) pay.textContent = value ? `Pay ${value}` : 'Pay';
}

document.addEventListener('submit', (event) => {
  const step = event.target;
  if (!step.matches('.gift-form__step')) return;
  event.preventDefault();
  const controls = [...step.querySelectorAll('.input__control')];
  const wrong = controls.map((control) => [control, problem(control)]);
  for (const [control, message] of wrong) showError(control, message);
  const first = wrong.find(([, message]) => message);
  if (first) {
    first[0].focus();
    return;
  }
  const card = step.closest('.gift-form');
  fillOrder(card);
  show(card, step.dataset.step === 'value' ? 'payment' : 'done');
});

document.addEventListener('click', (event) => {
  const back = event.target.closest?.('.gift-form__back');
  if (back) show(back.closest('.gift-form'), 'value');
});

// The picture of the card shows the chosen value on every step (#161): its file is in data-image of the radio
// (images/200.png … custom.png — "$..." for the own value). choice.js tells every change, also its own.
document.addEventListener('choice-change', (event) => {
  const card = event.target.closest('.gift-form');
  const src = event.detail.radio?.dataset.image;
  if (!card || !src) return;
  for (const image of card.querySelectorAll('.gift-form__image')) image.setAttribute('src', src);
});

// The pictures are loaded the first time a person comes to the form, so the first change does not blink.
const preloaded = new WeakSet();
function preload(event) {
  const card = event.target.closest?.('.gift-form');
  if (!card || preloaded.has(card)) return;
  preloaded.add(card);
  for (const radio of card.querySelectorAll('.choice__radio[data-image]')) new Image().src = radio.dataset.image;
}
document.addEventListener('pointerover', preload);
document.addEventListener('focusin', preload);

const last = new WeakMap(); // the digits after the previous edit

function reformat(input, event) {
  const before = last.get(input) ?? digitsOf(input.defaultValue);
  let digits = digitsOf(input.value);
  let caret = digitsOf(input.value.slice(0, input.selectionStart)).length; // digits before the caret

  // Only a separator was deleted: delete the digit next to it, or the template brings the separator back.
  if (digits === before && event.inputType === 'deleteContentBackward' && caret > 0) {
    digits = digits.slice(0, caret - 1) + digits.slice(caret);
    caret -= 1;
  } else if (digits === before && event.inputType === 'deleteContentForward') {
    digits = digits.slice(0, caret) + digits.slice(caret + 1);
  }

  const template = templateOf(input.name, digits);
  const length = template.replace(/[^X]/g, '').length;
  // A full value takes no more typed digits (like maxlength); a longer paste, or a whole number inserted at once (an
  // agent, a keyboard tool), is cut.
  if (digits.length > length && event.inputType === 'insertText' && event.data?.length === 1) {
    caret -= digits.length - before.length;
    digits = before;
  }
  digits = digits.slice(0, length);
  input.value = format(digits, template);
  last.set(input, digits);

  if (document.activeElement !== input) return; // autofill: no caret to keep
  let position = 0;
  for (let seen = 0; seen < Math.min(caret, digits.length); position++) if (/\d/.test(input.value[position])) seen++;
  input.setSelectionRange(position, position);
}

document.addEventListener('input', (event) => {
  const control = event.target;
  if (!control.matches?.('.gift-form .input__control')) return;
  if (templateOf(control.name, digitsOf(control.value))) reformat(control, event);
  if (control.getAttribute('aria-invalid') === 'true' && !problem(control)) showError(control, '');
});

// The bottom panel (#186): the dialog is a transparent frame, the form is the card at its bottom. A click in the room
// above the card reaches the dialog itself, inside its box — modal.js closes only outside the box, so the room closes
// it here, as the overlay does. Only a press that also started in the room counts: a text selection may end there.
let pressedRoom = false;
document.addEventListener('pointerdown', (event) => {
  pressedRoom = Boolean(event.target.matches?.('dialog.gift-dialog'));
});
document.addEventListener('click', (event) => {
  if (pressedRoom && event.target.matches?.('dialog.gift-dialog')) event.target.close();
  pressedRoom = false;
});

