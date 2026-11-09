// Route (#101): the swap button exchanges departure and destination. A field shows "prefix value" (stacked) or the
// value, or the placeholder when empty; the swap button hides by CSS while both are empty. setPlace() is shared with
// the airport search (airport.js), which opens from the fields. Pages are inserted into index.html, so events are
// delegated.

export function setPlace(field, value) {
  const out = field.querySelector('.input__value');
  field.dataset.value = value;
  out.classList.toggle('is-placeholder', !value);
  out.textContent = value || field.dataset.placeholder;
  if (value && field.dataset.prefix) {
    const prefix = document.createElement('span');
    prefix.className = 'route__prefix';
    prefix.textContent = `${field.dataset.prefix} `; // the space keeps the name "From: New York"
    out.prepend(prefix);
  }
}

document.addEventListener('click', (event) => {
  const swap = event.target.closest('.route__swap');
  if (!swap) return;
  const [from, to] = swap.closest('.route').querySelectorAll('.route__field');
  const departure = from.dataset.value;
  setPlace(from, to.dataset.value);
  setPlace(to, departure);
});
