console.log(typeof Intl.supportedValuesOf === 'function' ? 'YES' : 'NO');
try {
  console.log('Timezones:', Intl.supportedValuesOf('timeZone').length);
  console.log('Currencies:', Intl.supportedValuesOf('currency').length);
} catch (e) {
  console.error(e.message);
}
