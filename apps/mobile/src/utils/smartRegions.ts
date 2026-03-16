export const smartCountryData: Record<string, { name: string; currency: string; locale: string; timezone: string; cities: string[] }> = {
  "US": {
    "name": "United States",
    "currency": "USD",
    "locale": "en-US",
    "timezone": "America/New_York",
    "cities": [
      "New York",
      "Los Angeles",
      "Chicago",
      "Houston",
      "Phoenix"
    ]
  },
  "IN": {
    "name": "India",
    "currency": "INR",
    "locale": "en-IN",
    "timezone": "Asia/Kolkata",
    "cities": [
      "Mumbai",
      "Delhi",
      "Bangalore",
      "Hyderabad",
      "Chennai"
    ]
  },
  "GB": {
    "name": "United Kingdom",
    "currency": "GBP",
    "locale": "en-GB",
    "timezone": "Europe/London",
    "cities": [
      "London",
      "Birmingham",
      "Manchester",
      "Glasgow",
      "Edinburgh"
    ]
  },
  "CA": {
    "name": "Canada",
    "currency": "CAD",
    "locale": "en-CA",
    "timezone": "America/Toronto",
    "cities": [
      "Toronto",
      "Montreal",
      "Vancouver",
      "Calgary",
      "Ottawa"
    ]
  },
  "AU": {
    "name": "Australia",
    "currency": "AUD",
    "locale": "en-AU",
    "timezone": "Australia/Sydney",
    "cities": [
      "Sydney",
      "Melbourne",
      "Brisbane",
      "Perth",
      "Adelaide"
    ]
  },
  "DE": {
    "name": "Germany",
    "currency": "EUR",
    "locale": "de-DE",
    "timezone": "Europe/Berlin",
    "cities": [
      "Berlin",
      "Munich",
      "Frankfurt",
      "Hamburg",
      "Cologne"
    ]
  },
  "FR": {
    "name": "France",
    "currency": "EUR",
    "locale": "fr-FR",
    "timezone": "Europe/Paris",
    "cities": [
      "Paris",
      "Marseille",
      "Lyon",
      "Toulouse",
      "Nice"
    ]
  },
  "JP": {
    "name": "Japan",
    "currency": "JPY",
    "locale": "ja-JP",
    "timezone": "Asia/Tokyo",
    "cities": [
      "Tokyo",
      "Yokohama",
      "Osaka",
      "Nagoya",
      "Sapporo"
    ]
  },
  "AE": {
    "name": "United Arab Emirates",
    "currency": "AED",
    "locale": "ar-AE",
    "timezone": "Asia/Dubai",
    "cities": [
      "Dubai",
      "Abu Dhabi",
      "Sharjah",
      "Al Ain",
      "Ajman"
    ]
  },
  "SG": {
    "name": "Singapore",
    "currency": "SGD",
    "locale": "en-SG",
    "timezone": "Asia/Singapore",
    "cities": [
      "Singapore"
    ]
  }
};

export const countryOptions = Object.entries(smartCountryData).map(([code, data]) => ({ value: code, label: data.name })).sort((a, b) => a.label.localeCompare(b.label));
