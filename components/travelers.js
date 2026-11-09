// Travelers and class (#115): the dialog (travelers.css) of the Class/Travelers dropdown, opened by modal.js. The applied
// choice lives on the dropdown (data-adults, data-children, data-infants, data-class); every opening starts from it, so
// the close button, Escape or a click outside drop what was not applied. Apply writes the choice to the dropdown —
// label "Business / 1 Traveler", name "Travelers and class: Business / 1 Traveler" — and closes the dialog.
// Limits: adults from 1, children and infants on lap from 0; travelers with a seat (adults + children) up to 9; infants
// on lap no more than adults. A button at a limit is aria-disabled (it keeps the focus) and describes why when the
// reason is not obvious. The count is announced from aria-live. Pages are inserted into index.html, so events are delegated.

const MAX_SEATS = 9;
const TYPES = ['adults', 'children', 'infants'];

const rowOf = (dialog, type) => dialog.querySelector(`.travelers__row[data-type="${type}"]`);
const countOf = (dialog, type) => Number(rowOf(dialog, type).querySelector('.travelers__count').textContent);

const summary = (counts, cabin) => {
  const total = counts.adults + counts.children + counts.infants;
  return `${cabin} / ${total} ${total === 1 ? 'Traveler' : 'Travelers'}`;
};

// A reason is the id of a hidden text in the dialog: "Up to 9 travelers with a seat"…
function limit(button, blocked, reason) {
  button.setAttribute('aria-disabled', blocked);
  const id = reason && button.closest('.travelers').querySelector(`[data-reason="${reason}"]`)?.id;
  if (blocked && id) button.setAttribute('aria-describedby', id);
  else button.removeAttribute('aria-describedby');
}

function update(dialog) {
  const counts = Object.fromEntries(TYPES.map((type) => [type, countOf(dialog, type)]));
  const seatsFull = counts.adults + counts.children >= MAX_SEATS;
  const button = (type, step) => rowOf(dialog, type).querySelector(`[data-step="${step}"]`);
  const adultsMin = Math.max(1, counts.infants);
  limit(button('adults', -1), counts.adults <= adultsMin, counts.infants >= counts.adults && counts.adults > 1 ? 'infants' : 'adults');
  limit(button('adults', 1), seatsFull, 'seats');
  limit(button('children', -1), counts.children <= 0);
  limit(button('children', 1), seatsFull, 'seats');
  limit(button('infants', -1), counts.infants <= 0);
  limit(button('infants', 1), counts.infants >= counts.adults, 'infants');
}

function show(dialog, counts, cabin) {
  for (const type of TYPES) rowOf(dialog, type).querySelector('.travelers__count').textContent = counts[type];
  for (const radio of dialog.querySelectorAll('.travelers__radio')) radio.checked = radio.value === cabin;
  update(dialog);
}

document.addEventListener('modal-open', (event) => {
  const dialog = event.target;
  if (!dialog.matches('.travelers')) return;
  const { dataset } = dialog.opener;
  show(dialog, Object.fromEntries(TYPES.map((type) => [type, Number(dataset[type])])), dataset.class);
});

document.addEventListener('click', (event) => {
  const step = event.target.closest('.travelers [data-step]');
  if (step) {
    if (step.getAttribute('aria-disabled') === 'true') return; // focusable, but blocked
    const count = step.closest('.travelers__row').querySelector('.travelers__count');
    count.textContent = Number(count.textContent) + Number(step.dataset.step);
    update(step.closest('.travelers'));
    return;
  }

  const apply = event.target.closest('.travelers__apply');
  if (!apply) return;
  const dialog = apply.closest('dialog.travelers');
  const opener = dialog?.opener;
  if (!opener) return;
  const counts = Object.fromEntries(TYPES.map((type) => [type, countOf(dialog, type)]));
  const cabin = dialog.querySelector('.travelers__radio:checked').value;
  for (const type of TYPES) opener.dataset[type] = counts[type];
  opener.dataset.class = cabin;
  const label = summary(counts, cabin);
  opener.querySelector('.dropdown__label').textContent = label;
  opener.setAttribute('aria-label', `Travelers and class: ${label}`);
  dialog.close(); // modal.js returns the focus to the dropdown
});
