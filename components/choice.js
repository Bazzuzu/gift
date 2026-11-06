// Choice with an own value (#160): the last option, Custom (value="custom"), opens a field over the last row
// (choice.css). Chosen by a click or a tap — the field takes the focus; from the keyboard (the arrows) the focus stays
// on the radio and Tab goes into the field. The apply icon or Enter makes the amount the label of Custom ("$1,500")
// and keeps Custom chosen; its amount is in data-amount of the radio. A click elsewhere, Escape or the focus leaving
// the choice closes the field with nothing changed: the option chosen before is chosen again (Custom with an applied
// amount stays chosen — choosing it counts at once, the field only changes the amount). The amount is whole
// dollars, up to 5 digits, shown with separators ("1,500"); with no amount the apply icon is aria-disabled and says
// why. Every change of the chosen option — by a person or by this script — fires choice-change on the fieldset
// (detail.radio), e.g. the gift voucher form shows the picture of the chosen value (#161). Events are delegated: pages
// are inserted into index.html.

const MAX_DIGITS = 5; // up to $99,999 (the limits — BACKLOG.md)

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

// The option chosen before Custom opened: the last one chosen, or the one checked in the markup.
function committedOf(choice) {
  const value = choice.dataset.committed;
  return value
    ? choice.querySelector(`.choice__radio[value="${value}"]`)
    : [...choice.querySelectorAll('.choice__radio')].find((radio) => radio.defaultChecked);
}

function syncApply(choice) {
  const apply = choice.querySelector('.choice__apply');
  const empty = !Number(digitsOf(inputOf(choice).value));
  const reason = choice.querySelector('[data-reason]');
  apply.setAttribute('aria-disabled', String(empty));
  if (empty && reason) apply.setAttribute('aria-describedby', reason.id);
  else apply.removeAttribute('aria-describedby');
}

function open(choice, focus) {
  if (!isOpen(choice)) {
    choice.dataset.open = '';
    inputOf(choice).value = money(customOf(choice).dataset.amount ?? '');
    syncApply(choice);
  }
  if (focus) inputOf(choice).focus();
}

function close(choice, { restore = false, focus = false } = {}) {
  if (!isOpen(choice)) return;
  delete choice.dataset.open;
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
  const digits = digitsOf(inputOf(choice).value);
  if (!Number(digits)) {
    inputOf(choice).focus();
    return;
  }
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

// A click on Custom that is already chosen (with its amount) opens the field again.
document.addEventListener('click', (event) => {
  const radio = event.target;
  if (radio.matches?.('.choice__radio[value="custom"]') && radio.checked) choose(radio);
  const applyButton = event.target.closest?.('.choice__apply');
  if (applyButton) apply(applyButton.closest('.choice'));
});

// A press anywhere outside the field closes it with nothing changed (a press on another option then chooses it).
document.addEventListener('pointerdown', (event) => {
  for (const choice of document.querySelectorAll('.choice[data-open]')) {
    if (!choice.querySelector('.choice__other').contains(event.target)) close(choice, { restore: true });
  }
});

// The focus leaving the choice (Tab past the field) closes it with nothing changed.
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

// The amount: digits only, no leading zeros, up to MAX_DIGITS, with separators; the caret stays after the same digit.
document.addEventListener('input', (event) => {
  const input = event.target;
  if (!input.matches?.('.choice__input')) return;
  const caretDigits = digitsOf(input.value.slice(0, input.selectionStart)).length;
  const raw = digitsOf(input.value);
  const zeros = raw.length - raw.replace(/^0+/, '').length;
  const digits = raw.slice(zeros, zeros + MAX_DIGITS);
  input.value = money(digits);
  const caret = Math.min(Math.max(0, caretDigits - zeros), digits.length);
  let position = 0;
  for (let seen = 0; seen < caret; position++) if (/\d/.test(input.value[position])) seen++;
  input.setSelectionRange(position, position);
  syncApply(input.closest('.choice'));
});
