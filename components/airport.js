// Airport search (#102): the dialog of the route fields (opened by modal.js from a field with
// aria-controls="airport-search"). The opener's data-kind (from | to) sets the title and the sections; typing replaces
// the sections with the matches; choosing an option writes "City (CODE)" to the field and closes the dialog. The other
// field's city is never offered (no New York → New York). Keyboard: ↓ from the search goes to the first option, ↑ / ↓
// move between options, ↑ from the first returns to the search. Data is a mock: the departure comes from the location
// (New York in the sandbox), recent lists live in memory.

import { setPlace } from './route.js';

const ALL = 'City, All Airports';
const PLACES = [
  ['NYC', 'New York', 'United States', ALL],
  ['JFK', 'New York', 'United States', 'John F. Kennedy International Airport'],
  ['EWR', 'New York', 'United States', 'Newark Liberty International Airport'],
  ['LGA', 'New York', 'United States', 'LaGuardia Airport'],
  ['HPN', 'New York', 'United States', 'Westchester County Airport'],
  ['ISP', 'New York', 'United States', 'Long Island MacArthur Airport'],
  ['SWF', 'New York', 'United States', 'New York Stewart International Airport'],
  ['LON', 'London', 'United Kingdom', ALL],
  ['LHR', 'London', 'United Kingdom', 'London Heathrow Airport'],
  ['LGW', 'London', 'United Kingdom', 'London Gatwick Airport'],
  ['PAR', 'Paris', 'France', ALL],
  ['CDG', 'Paris', 'France', 'Paris Charles de Gaulle Airport'],
  ['TYO', 'Tokyo', 'Japan', ALL],
  ['HND', 'Tokyo', 'Japan', 'Tokyo Haneda Airport'],
  ['DXB', 'Dubai', 'United Arab Emirates', 'Dubai International Airport'],
  ['ROM', 'Rome', 'Italy', ALL],
  ['FCO', 'Rome', 'Italy', 'Rome Fiumicino Airport'],
  ['LAX', 'Los Angeles', 'United States', 'Los Angeles International Airport'],
  ['MIA', 'Miami', 'United States', 'Miami International Airport'],
  ['SIN', 'Singapore', 'Singapore', 'Singapore Changi Airport'],
  ['HKG', 'Hong Kong', 'Hong Kong', 'Hong Kong International Airport'],
  // Long names, to check the ellipsis (#107).
  ['FRA', 'Frankfurt', 'Germany', 'Frankfurt am Main Airport'],
  ['SFO', 'San Francisco', 'United States', 'San Francisco International Airport'],
  ['WAS', 'Washington', 'United States', ALL],
  ['IAD', 'Washington', 'United States', 'Washington Dulles International Airport'],
  ['DCA', 'Washington', 'United States', 'Ronald Reagan Washington National Airport'],
  ['RIO', 'Rio de Janeiro', 'Brazil', ALL],
  ['GIG', 'Rio de Janeiro', 'Brazil', 'Rio de Janeiro–Galeão International Airport'],
  ['BUE', 'Buenos Aires', 'Argentina', ALL],
  ['EZE', 'Buenos Aires', 'Argentina', 'Ministro Pistarini International Airport'],
  ['DFW', 'Dallas', 'United States', 'Dallas Fort Worth International Airport'],
  ['JNB', 'Johannesburg', 'South Africa', 'O. R. Tambo International Airport'],
  ['KUL', 'Kuala Lumpur', 'Malaysia', 'Kuala Lumpur International Airport'],
  ['SGN', 'Ho Chi Minh City', 'Vietnam', 'Tan Son Nhat International Airport'],
  ['AUH', 'Abu Dhabi', 'United Arab Emirates', 'Zayed International Airport'],
].map(([code, city, country, name]) => ({ code, city, country, name }));
const byCode = (code) => PLACES.find((p) => p.code === code);

// Mock: the location gives New York; its airports are the nearest; popular destinations depend on the departure city.
const NEARBY = ['NYC', 'JFK', 'EWR', 'LGA', 'HPN', 'ISP', 'SWF'];
const POPULAR = { 'New York': ['LON', 'PAR', 'TYO', 'DXB', 'ROM', 'SFO', 'FRA'] };
const POPULAR_ANY = ['NYC', 'LON', 'PAR', 'TYO', 'DXB', 'SIN', 'HKG'];
const recent = { from: ['LHR', 'SFO', 'DCA'], to: ['CDG', 'GIG', 'HND', 'AUH', 'SGN'] };
const LIMIT = { from: 3, to: 7 };

const codeOf = (value) => value?.match(/\(([A-Z]{3})\)$/)?.[1];
const cityOf = (field) => byCode(codeOf(field?.dataset.value))?.city;

function option(place) {
  const name = `${place.city}, ${place.country}, ${place.name}, ${place.code}`;
  const icon = place.name === ALL ? 'apartment' : 'airplane'; // a city with all its airports, or one airport
  return `<li><button class="airport__option" type="button" data-code="${place.code}" aria-label="${name}">
    <span class="airport__icon"><span class="icon icon--${icon}" aria-hidden="true"></span></span>
    <span class="airport__place"><span class="airport__city">${place.city}, ${place.country}</span><span class="airport__name">${place.name}</span></span>
    <span class="airport__code">${place.code}</span></button></li>`;
}

function section(id, title, places, clear) {
  if (!places.length) return '';
  return `<section class="airport__section" aria-labelledby="${id}">
    <div class="airport__section-header"><h3 class="airport__heading" id="${id}">${title}</h3>${clear ? `<button class="airport__clear" type="button" data-clear="${clear}" aria-label="Clear ${title.toLowerCase()}">Clear</button>` : ''}</div>
    <ul class="airport__list">${places.map(option).join('')}</ul></section>`;
}

function render(dialog) {
  const { kind } = dialog.opener.dataset;
  const route = dialog.opener.closest('.route');
  const other = route?.querySelectorAll('.route__field')[kind === 'from' ? 1 : 0];
  const avoid = cityOf(other);
  const keep = (codes) => codes.map(byCode).filter((p) => p && p.city !== avoid);
  const query = dialog.querySelector('.airport__query').value.trim().toLowerCase();
  const results = dialog.querySelector('.airport__results');
  const status = dialog.querySelector('.airport__status');
  if (query) {
    const found = PLACES.filter((p) => p.city !== avoid && [p.code, p.city, p.country, p.name].some((t) => t.toLowerCase().includes(query)));
    status.textContent = found.length ? `${found.length} ${found.length === 1 ? 'result' : 'results'}` : 'No results';
    results.innerHTML = found.length ? `<ul class="airport__list">${found.map(option).join('')}</ul>` : '';
    return;
  }
  status.textContent = '';
  const departure = cityOf(route?.querySelector('.route__field'));
  results.innerHTML = kind === 'from'
    ? section('airport-recent', 'Recent locations', keep(recent.from), 'from') + section('airport-nearby', 'Based on your location', keep(NEARBY))
    : section('airport-recent', 'Recent destinations', keep(recent.to), 'to') + section('airport-popular', 'Popular destinations', keep(POPULAR[departure] ?? POPULAR_ANY));
}

document.addEventListener('modal-open', (event) => {
  const dialog = event.target;
  if (!dialog.matches('.airport')) return;
  const { kind, placeholder } = dialog.opener.dataset;
  dialog.querySelector('.airport__title').textContent = kind === 'from' ? 'Flying from' : 'Going to';
  const query = dialog.querySelector('.airport__query');
  query.value = '';
  query.placeholder = placeholder;
  render(dialog);
});

document.addEventListener('modal-opened', (event) => {
  if (event.target.matches('.airport')) event.target.querySelector('.airport__query').focus();
});

document.addEventListener('input', (event) => {
  if (event.target.matches('.airport__query')) render(event.target.closest('dialog'));
});

document.addEventListener('click', (event) => {
  const dialog = event.target.closest('dialog.airport');
  if (!dialog) return;
  const clear = event.target.closest('.airport__clear');
  if (clear) {
    recent[clear.dataset.clear] = [];
    render(dialog);
    dialog.querySelector('.airport__query').focus();
    return;
  }
  const choice = event.target.closest('.airport__option');
  if (!choice) return;
  const { kind } = dialog.opener.dataset;
  const place = byCode(choice.dataset.code);
  setPlace(dialog.opener, `${place.city} (${place.code})`);
  recent[kind] = [place.code, ...recent[kind].filter((c) => c !== place.code)].slice(0, LIMIT[kind]);
  dialog.close();
});

document.addEventListener('keydown', (event) => {
  const dialog = event.target.closest?.('dialog.airport');
  if (!dialog || (event.key !== 'ArrowDown' && event.key !== 'ArrowUp')) return;
  const options = [...dialog.querySelectorAll('.airport__option')];
  const query = dialog.querySelector('.airport__query');
  const at = options.indexOf(event.target);
  const next = event.key === 'ArrowDown'
    ? (event.target === query ? options[0] : options[at + 1])
    : (at === 0 ? query : options[at - 1]);
  if (!next || (at === -1 && event.target !== query)) return;
  event.preventDefault();
  next.focus();
  next.scrollIntoView?.({ block: 'nearest' });
});
