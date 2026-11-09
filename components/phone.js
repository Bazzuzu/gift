// Phone (#108): the number is formatted by the country's template while typing ("2125550123" → "212 555 0123"). Only
// digits are kept; a pasted or autofilled number with the country code ("+1 (212) 555-0123") loses the code, a national
// one loses the trunk 0 ("06 12 34 56 78" in France); a full number takes no more typed digits. The caret stays after
// the same digit, and Backspace or Delete on a space removes the digit next to it.
// Country menu (#110): .phone__country opens #phone-countries — the shared menu (menu.js, menu.css) under the field.
// Pages are inserted into index.html, so events are delegated.

// Mock data — the countries of the flags in Figma: name, dial code, national number template (X — a digit). The flag is
// sandbox/flags/<id>.svg, lowercase (a missing file leaves an empty place). The US first, the others by name.
export const COUNTRIES = {
  US: { name: 'United States', code: '+1', template: 'XXX XXX XXXX' },
  FR: { name: 'France', code: '+33', template: 'X XX XX XX XX' },
  IE: { name: 'Ireland', code: '+353', template: 'XX XXX XXXX' },
  NL: { name: 'Netherlands', code: '+31', template: 'X XXXXXXXX' },
  NO: { name: 'Norway', code: '+47', template: 'XXX XX XXX' },
  PL: { name: 'Poland', code: '+48', template: 'XXX XXX XXX' },
  SK: { name: 'Slovakia', code: '+421', template: 'XXX XXX XXX' },
  ES: { name: 'Spain', code: '+34', template: 'XXX XX XX XX' },
  UA: { name: 'Ukraine', code: '+380', template: 'XX XXX XX XX' },
};

const digitsOf = (text) => text.replace(/\D/g, '');
const lengthOf = (template) => template.replace(/[^X]/g, '').length;
const last = new WeakMap(); // the digits after the previous edit

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

export function setCountry(phone, id) {
  const country = COUNTRIES[id];
  const input = phone.querySelector('.phone__number');
  phone.dataset.country = id;
  phone.querySelector('.phone__flag').classList.remove('is-missing');
  phone.querySelector('.phone__flag').src = `flags/${id.toLowerCase()}.svg`;
  phone.querySelector('.phone__code').textContent = country.code;
  phone.querySelector('.phone__country').dataset.value = id;
  phone.querySelector('.phone__country').setAttribute('aria-label', `Country code: ${country.name}, ${country.code}`);
  input.placeholder = country.template;
  input.value = format(digitsOf(input.value).slice(0, lengthOf(country.template)), country.template);
  last.set(input, digitsOf(input.value));
}

document.addEventListener('input', (event) => {
  const input = event.target;
  if (!input.matches?.('.phone__number')) return;
  const { code, template } = COUNTRIES[input.closest('.phone').dataset.country];
  const before = last.has(input) ? last.get(input) : digitsOf(input.defaultValue);
  let digits = digitsOf(input.value);
  let caret = digitsOf(input.value.slice(0, input.selectionStart)).length; // digits before the caret

  // Only a space was deleted: delete the digit next to it, or the template brings the space back.
  if (digits === before && event.inputType === 'deleteContentBackward' && caret > 0) {
    digits = digits.slice(0, caret - 1) + digits.slice(caret);
    caret -= 1;
  } else if (digits === before && event.inputType === 'deleteContentForward') {
    digits = digits.slice(0, caret) + digits.slice(caret + 1);
  }

  // A number with the country code (pasted, autofilled, or a US number typed with the leading 1), or with the trunk 0.
  const dial = digitsOf(code);
  if ((input.value.includes('+') || digits.length > lengthOf(template)) && digits.startsWith(dial)) {
    digits = digits.slice(dial.length);
    caret = Math.max(0, caret - dial.length);
  } else if (digits.length > lengthOf(template) && digits.startsWith('0')) {
    digits = digits.slice(1);
    caret = Math.max(0, caret - 1);
  }

  // A full number takes no more typed digits (like maxlength); a longer paste is cut.
  if (digits.length > lengthOf(template) && event.inputType === 'insertText') {
    caret -= digits.length - before.length;
    digits = before;
  }
  digits = digits.slice(0, lengthOf(template));
  input.value = format(digits, template);
  last.set(input, digits);

  if (document.activeElement !== input) return; // autofill: no caret to keep
  let position = 0;
  for (let seen = 0; seen < Math.min(caret, digits.length); position++) if (/\d/.test(input.value[position])) seen++;
  input.setSelectionRange(position, position);
});

// Country menu (#110, #113): the shared menu (menu.js) with options built from COUNTRIES on the first opening; a choice
// sets the country of the field.
const MENU = 'phone-countries';

document.addEventListener('menu-open', (event) => {
  const menu = event.target;
  if (menu.id !== MENU || menu.childElementCount) return;
  for (const [id, { name, code }] of Object.entries(COUNTRIES)) {
    const option = document.createElement('button');
    option.className = 'menu__option';
    option.type = 'button';
    option.tabIndex = -1;
    option.dataset.value = id;
    option.setAttribute('role', 'option');
    option.innerHTML = `<img class="menu__flag" src="flags/${id.toLowerCase()}.svg" alt=""><span class="menu__label">${name}</span><span class="menu__note">(${code})</span>`;
    menu.append(option);
  }
});

document.addEventListener('menu-change', (event) => {
  const { opener, option } = event.detail;
  if (opener.matches('.phone__country')) setCountry(opener.closest('.phone'), option.dataset.value);
});

// A flag of the field that is not downloaded yet keeps its place without the broken image icon (capture: no bubbling).
document.addEventListener('error', (event) => {
  if (event.target.matches?.('.phone__flag')) event.target.classList.add('is-missing');
}, true);
