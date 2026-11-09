// Contact form (#118): checks the required fields on send. The form is novalidate — instead of the browser bubbles each
// field shows its own error (AGENTS.md «Доступность»): aria-invalid="true", the text under the field linked with
// aria-describedby, the focus on the first field with an error. Typing a valid value removes the error. Sending is not
// wired: a valid form stops there. The search form with contacts (.search-form--contact, #167) is checked the same
// way. Pages are inserted into index.html, so events are delegated.

const CHECKED = ':is(.contact-form, .search-form--contact)';

const MESSAGES = {
  name: 'Enter your name',
  email: 'Enter an email like name@example.com',
  phone: 'Enter your phone number',
};

// Also used by the gift voucher form (gift-form.js, #157).
export function showError(control, message) {
  const field = control.closest('.input');
  let text = field.querySelector('.input__supporting');
  if (!message) {
    control.removeAttribute('aria-invalid');
    control.removeAttribute('aria-describedby');
    text?.remove();
    return;
  }
  if (!text) {
    text = document.createElement('p');
    text.className = 'input__supporting';
    text.id = `${control.id}-error`;
    field.append(text);
  }
  text.textContent = message;
  control.setAttribute('aria-invalid', 'true');
  control.setAttribute('aria-describedby', text.id);
}

document.addEventListener('submit', (event) => {
  const form = event.target;
  if (!form.matches(CHECKED)) return;
  event.preventDefault();
  const invalid = [...form.querySelectorAll('.input__control[required]')].filter((control) => !control.validity.valid);
  for (const control of form.querySelectorAll('.input__control[required]')) {
    showError(control, invalid.includes(control) ? MESSAGES[control.name] : '');
  }
  invalid[0]?.focus();
});

document.addEventListener('input', (event) => {
  const control = event.target;
  if (control.matches?.(`${CHECKED} .input__control[aria-invalid="true"]`) && control.validity.valid) showError(control, '');
});
