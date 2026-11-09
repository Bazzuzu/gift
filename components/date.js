// Date field and calendar (#94): the field opens its calendar through the shared modal (modal.js: opening, closing,
// focus return, #102); days choose a date or a range, the confirm button writes the dates to the fields. Keyboard in
// the calendar: arrows ±1 day / ±1 week, Home / End — start / end of the week, Page Up / Page Down — ±1 month; one day
// is in the Tab order (roving tabindex). Pages are inserted into index.html, so events are delegated.

const iso = (date) => [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
const parse = (value) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); };
const shift = (value, days, months = 0) => { const d = parse(value); d.setMonth(d.getMonth() + months, d.getDate() + days); return iso(d); };
const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: '2-digit' });
const full = new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

// Marks the chosen days, the band between them, the names and the summary.
function render(dialog) {
  const { start = '', end = '', mode } = dialog.dataset;
  for (const day of dialog.querySelectorAll('.calendar__day')) {
    const date = day.dataset.date;
    const edge = date === start || date === end;
    const inside = mode === 'range' && start && end && date > start && date < end;
    const cell = day.parentElement;
    cell.classList.toggle('is-range-start', mode === 'range' && Boolean(end) && date === start && start !== end);
    cell.classList.toggle('is-range-end', mode === 'range' && date === end && start !== end);
    cell.classList.toggle('is-in-range', Boolean(inside));
    day.setAttribute('aria-pressed', String(edge));
    const role = date === start ? (mode === 'range' ? ', departure' : ', selected') : date === end ? ', return' : inside ? ', in the selected range' : '';
    day.setAttribute('aria-label', `${full.format(parse(date))}${role}`);
  }
  const values = dialog.querySelectorAll('.calendar__summary-value');
  if (values[0]) values[0].textContent = start ? short.format(parse(start)) : 'Add date';
  if (values[1]) values[1].textContent = end ? short.format(parse(end)) : 'Add date';
  values.forEach((value) => value.classList.remove('is-invalid'));
}

function focusDay(dialog, date) {
  const day = dialog.querySelector(`.calendar__day[data-date="${date}"]:not(:disabled)`);
  if (!day) return;
  dialog.querySelectorAll('.calendar__day[tabindex="0"]').forEach((d) => d.setAttribute('tabindex', '-1'));
  day.setAttribute('tabindex', '0');
  day.focus();
  day.scrollIntoView({ block: 'nearest' });
}

document.addEventListener('modal-open', (event) => {
  const dialog = event.target;
  if (!dialog.matches('.calendar')) return;
  render(dialog);
  dialog.confirmed = false;
  dialog.committed = { start: dialog.dataset.start, end: dialog.dataset.end };
});

document.addEventListener('modal-opened', (event) => {
  const dialog = event.target;
  if (!dialog.matches('.calendar')) return;
  const first = dialog.dataset.start || dialog.querySelector('.calendar__day[aria-current="date"]')?.dataset.date;
  dialog.querySelector(`.calendar__day[data-date="${first}"]`)?.scrollIntoView({ block: 'center' });
  focusDay(dialog, first);
});

// Closed without confirm (Escape, ×, a click outside): the choice goes back to the dates in the fields (#99).
document.addEventListener('modal-close', (event) => {
  const dialog = event.target;
  if (!dialog.matches('.calendar') || dialog.confirmed) return;
  const { start, end } = dialog.committed;
  dialog.dataset.start = start;
  if (end) dialog.dataset.end = end;
  else delete dialog.dataset.end;
});

document.addEventListener('click', (event) => {
  const dialog = event.target.closest('dialog.calendar');
  if (!dialog) return;
  const day = event.target.closest('.calendar__day');
  if (day && !day.disabled) {
    const { start, end, mode } = dialog.dataset;
    const date = day.dataset.date;
    if (mode === 'range' && start && !end && date >= start) dialog.dataset.end = date;
    else { dialog.dataset.start = date; delete dialog.dataset.end; }
    render(dialog);
    focusDay(dialog, date);
  } else if (event.target.closest('.calendar__submit')) {
    // A range needs both dates: the missing return turns red and the dialog stays open (#99). The text is set again,
    // so screen readers announce it from the live region.
    if (dialog.dataset.mode === 'range' && !dialog.dataset.end) {
      const missing = dialog.querySelectorAll('.calendar__summary-value')[1];
      missing.classList.remove('is-invalid');
      void missing.offsetWidth; // restart the bounce on every press
      missing.classList.add('is-invalid');
      missing.textContent = 'Add date';
      return;
    }
    dialog.confirmed = true;
    // The dates go to the field (or the range) the dialog was opened from.
    const group = dialog.opener.closest('.input-pair') ?? dialog.opener;
    const fields = group.querySelectorAll('.input__value');
    const dates = [dialog.dataset.start, dialog.dataset.end];
    fields.forEach((value, i) => { if (dates[i]) value.textContent = short.format(parse(dates[i])); });
    dialog.close();
  }
});

document.addEventListener('keydown', (event) => {
  const day = event.target.closest?.('dialog.calendar .calendar__day');
  if (!day) return;
  const date = day.dataset.date;
  const weekday = parse(date).getDay();
  const moves = {
    ArrowLeft: () => shift(date, -1), ArrowRight: () => shift(date, 1),
    ArrowUp: () => shift(date, -7), ArrowDown: () => shift(date, 7),
    Home: () => shift(date, -weekday), End: () => shift(date, 6 - weekday),
    PageUp: () => shift(date, 0, -1), PageDown: () => shift(date, 0, 1),
  };
  if (!moves[event.key]) return;
  event.preventDefault();
  focusDay(day.closest('dialog'), moves[event.key]());
});
