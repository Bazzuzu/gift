// Search form (#117): the trip type switches the dates — Round-trip shows the range, One-way and Multi-city one date
// (Multi-city legs — after the design, BACKLOG.md). The departure carries over between the two calendars; a return
// before the new departure moves to the departure day. The search itself is not wired: the submit button only stops
// the page reload. Pages are inserted into index.html, so events are delegated.

const parse = (value) => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d); };
const short = new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: '2-digit' });

const calendarOf = (field) => document.getElementById(field.querySelector('.input__field').getAttribute('aria-controls'));
const show = (field, value) => { field.querySelector('.input__value').textContent = short.format(parse(value)); };

document.addEventListener('menu-change', (event) => {
  const { opener, option } = event.detail;
  const form = opener.closest('.search-form');
  if (!form || opener.dataset.name !== 'Trip type') return;
  const range = form.querySelector('.search-form__dates');
  const single = form.querySelector('.search-form__date');
  const oneDate = option.dataset.value !== 'RT';
  if (single.hidden === !oneDate) return; // the same kind of dates

  const [departure, ret] = range.querySelectorAll('.input');
  const rangeCalendar = calendarOf(departure);
  const singleCalendar = calendarOf(single);
  if (oneDate) {
    singleCalendar.dataset.start = rangeCalendar.dataset.start;
    show(single, singleCalendar.dataset.start);
  } else {
    const start = singleCalendar.dataset.start;
    rangeCalendar.dataset.start = start;
    if (!rangeCalendar.dataset.end || rangeCalendar.dataset.end < start) rangeCalendar.dataset.end = start;
    show(departure, start);
    show(ret, rangeCalendar.dataset.end);
  }
  range.hidden = oneDate;
  single.hidden = !oneDate;
});

document.addEventListener('submit', (event) => {
  if (event.target.matches('.search-form')) event.preventDefault();
});
