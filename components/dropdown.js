// Dropdown (#112, #113): a .dropdown with popovertarget opens a shared menu (menu.js, menu.css); a choice becomes its
// label and its name — data-name is the part before the colon ("Trip type: One-way"). Pages are inserted into
// index.html, so events are delegated.

document.addEventListener('menu-change', (event) => {
  const { opener, option } = event.detail;
  if (!opener.matches('.dropdown')) return;
  const label = option.querySelector('.menu__label').textContent;
  opener.querySelector('.dropdown__label').textContent = label;
  if (opener.dataset.name) opener.setAttribute('aria-label', `${opener.dataset.name}: ${label}`);
});
