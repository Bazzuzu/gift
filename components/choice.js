// Choice with an own value (#160, #193): the last option, Custom (value="custom"), opens a row over the last row
// (choice.css): the field, the apply button (check) and the cancel button (cross). Chosen by a click or a tap — the
// field takes the focus; from the keyboard (the arrows) the focus stays on the radio and Tab goes into the field. The
// check or Enter applies the amount: from data-min to data-max of the field, it becomes the label of Custom ("$1,500")
// and Custom stays chosen; its amount is in data-amount of the radio. Otherwise the error under the row says what to
// type (aria-invalid, aria-describedby, aria-live) and the focus goes back to the field; once the error shows, it
// follows the typing and goes away when the amount fits. The cross, a click elsewhere, Escape or the focus leaving the
// choice close the field with nothing changed: the option chosen before is chosen again (Custom with an applied
// amount stays chosen — choosing it counts at once, the field only changes the amount). The amount is whole dollars,
// up to as many digits as data-max has, shown with separators ("1,500"). Every change of the chosen option — by a
// person or by this script — fires choice-change on the fieldset (detail.radio), e.g. the gift voucher form shows the
// picture of the chosen value (#161). Events are delegated: pages are inserted into index.html.

const digitsOf = (text) => text.replace(/\D/g, '');
const money = (digits) => (digits ? Number(digits).toLocaleString('en-US') : '');

// Tells the page which option is chosen now (event choice-change, detail.radio) — also when this script chooses it
// itself (apply, close with nothing changed): setting checked from a script fires no change event (#161).
function announce(choice) {
  const radio = choice.querySelector('.choice__radio:checked');
  choice.dispatchEvent(new CustomEvent('choice-change', { bubbles: true, detail: { radio } }));
}

const isOpen = (choice) => 'open' in choice.dataset;
const customOf = (choice) => choice.querySelector('.choice__radio[value="custom"]');
const inputOf = (choice) => choice.querySelector('.choice__input');
const limitsOf = (input) => ({ min: Number(input.dataset.min) || 1, max: Number(input.dataset.max) || Infinity });

// The option chosen before Custom opened: the last one chosen, or the one checked in the markup.
function committedOf(choice) {
  const value = choice.dataset.committed;
  return value
    ? choice.querySelector(`.choice__radio[value="${value}"]`)
    : [...choice.querySelectorAll('.choice__radio')].find((radio) => radio.defaultChecked);
}

// What is wrong with the amount, in words, or '' when it fits.
function problemOf(input) {
  const amount = Number(digitsOf(input.value));
  const { min, max } = limitsOf(input);
  if (!amount) return `Enter an amount from $${money(String(min))} to $${money(String(max))}`;
  if (amount < min) return `The minimum amount is $${money(String(min))}`;
  if (amount > max) return `The maximum amount is $${money(String(max))}`;
  return '';
}

function showError(choice, message) {
  const input = inputOf(choice);
  const error = choice.querySelector('.choice__error');
  if (error.textContent !== message) error.textContent = message;
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', error.id);
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

function open(choice, focus) {
  if (!isOpen(choice)) {
    choice.dataset.open = '';
    inputOf(choice).value = money(customOf(choice).dataset.amount ?? '');
    showError(choice, '');
  }
  if (focus) inputOf(choice).focus();
}

function close(choice, { restore = false, focus = false } = {}) {
  if (!isOpen(choice)) return;
  delete choice.dataset.open;
  showError(choice, '');
  if (restore) {
    const before = committedOf(choice);
    if (before && !before.checked) {
      before.checked = true;
      announce(choice);
    }
  }
  if (focus) choice.querySelector('.choice__radio:checked')?.focus();
}

function apply(choice) {
  const input = inputOf(choice);
  const problem = problemOf(input);
  if (problem) {
    showError(choice, problem);
    input.focus();
    return;
  }
  const digits = digitsOf(input.value);
  const custom = customOf(choice);
  custom.dataset.amount = String(Number(digits));
  custom.checked = true;
  custom.closest('.choice__option').querySelector('.button__label').textContent = `$${money(digits)}`;
  choice.dataset.committed = 'custom';
  close(choice, { focus: true });
  announce(choice);
}

// Choosing: Custom opens the field, any other option is the new choice and closes it. Custom with an applied amount
// ("$1,500") is an option like the others: choosing it counts at once, the field only lets the amount be changed.
function choose(radio) {
  const choice = radio.closest('.choice');
  if (!choice?.querySelector('.choice__other')) return;
  if (radio.value === 'custom') {
    if (radio.dataset.amount) choice.dataset.committed = 'custom';
    open(choice, document.documentElement.dataset.modality === 'pointer');
  } else {
    choice.dataset.committed = radio.value;
    close(choice);
  }
}

document.addEventListener('change', (event) => {
  if (!event.target.matches?.('.choice__radio') || !event.target.checked) return;
  choose(event.target);
  announce(event.target.closest('.choice'));
});

// A click on Custom that is already chosen (with its amount) opens the field again; the check applies, the cross
// closes with nothing changed.
document.addEventListener('click', (event) => {
  const radio = event.target;
  if (radio.matches?.('.choice__radio[value="custom"]') && radio.checked) choose(radio);
  const applyButton = event.target.closest?.('.choice__apply');
  if (applyButton) apply(applyButton.closest('.choice'));
  const cancelButton = event.target.closest?.('.choice__cancel');
  if (cancelButton) close(cancelButton.closest('.choice'), { restore: true, focus: true });
});

// A press anywhere outside the row closes it with nothing changed (a press on another option then chooses it).
document.addEventListener('pointerdown', (event) => {
  for (const choice of document.querySelectorAll('.choice[data-open]')) {
    if (!choice.querySelector('.choice__other').contains(event.target)) close(choice, { restore: true });
  }
});

// The focus leaving the choice (Tab past the row) closes it with nothing changed.
document.addEventListener('focusout', (event) => {
  const choice = event.target.closest?.('.choice[data-open]');
  if (choice && !choice.contains(event.relatedTarget) && event.relatedTarget) close(choice, { restore: true });
});

document.addEventListener('keydown', (event) => {
  const choice = event.target.closest?.('.choice[data-open]');
  if (!choice) return;
  if (event.key === 'Escape') {
    event.preventDefault();
    close(choice, { restore: true, focus: true });
  } else if (event.key === 'Enter' && event.target.matches('.choice__input')) {
    event.preventDefault(); // Enter applies the amount, it does not send the form
    apply(choice);
  }
});

// The amount: digits only, no leading zeros, up to the digits of data-max, with separators; the caret stays after the
// same digit. A shown error follows the typing.
document.addEventListener('input', (event) => {
  const input = event.target;
  if (!input.matches?.('.choice__input')) return;
  const maxDigits = String(limitsOf(input).max).length;
  const caretDigits = digitsOf(input.value.slice(0, input.selectionStart)).length;
  const raw = digitsOf(input.value);
  const zeros = raw.length - raw.replace(/^0+/, '').length;
  const digits = raw.slice(zeros, zeros + (Number.isFinite(limitsOf(input).max) ? maxDigits : raw.length));
  input.value = money(digits);
  const caret = Math.min(Math.max(0, caretDigits - zeros), digits.length);
  let position = 0;
  for (let seen = 0; seen < caret; position++) if (/\d/.test(input.value[position])) seen++;
  input.setSelectionRange(position, position);
  if (input.getAttribute('aria-invalid') === 'true') showError(input.closest('.choice'), problemOf(input));
});
