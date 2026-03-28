import { readFileSync } from 'fs';

const ru = JSON.parse(readFileSync('./packages/shared/src/i18n/locales/ru.json', 'utf8'));
const en = JSON.parse(readFileSync('./packages/shared/src/i18n/locales/en.json', 'utf8'));

function flatKeys(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    typeof v === 'object' && v !== null ? flatKeys(v, prefix + k + '.') : [prefix + k]
  );
}

const ruKeys = new Set(flatKeys(ru));
const enKeys = new Set(flatKeys(en));

const onlyRu = [...ruKeys].filter(k => !enKeys.has(k));
const onlyEn = [...enKeys].filter(k => !ruKeys.has(k));

console.log('RU total:', ruKeys.size, 'EN total:', enKeys.size);
if (onlyRu.length) console.log('Only in RU:', onlyRu);
if (onlyEn.length) console.log('Only in EN:', onlyEn);
if (!onlyRu.length && !onlyEn.length) console.log('SYNC OK');

const newKeys = [
  'login.description', 'login.try_without',
  'guest.banner_title', 'guest.banner_subtitle', 'guest.limit_title', 'guest.limit_text', 'guest.result_cta',
  'paywall.title', 'paywall.text', 'paywall.features', 'paywall.cta'
];
const missing = newKeys.filter(k => !ruKeys.has(k) || !enKeys.has(k));
if (missing.length) console.log('Missing new keys:', missing);
else console.log('All new keys present in both locales');
