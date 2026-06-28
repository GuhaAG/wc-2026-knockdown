// Map TheSportsDB national-team names to ISO codes used by flagcdn.com.
// Unmapped names fall back to an initials badge (see ui.js), so this never throws.
const CODES = {
  "Algeria": "dz", "Argentina": "ar", "Australia": "au", "Austria": "at", "Belgium": "be",
  "Bolivia": "bo", "Bosnia-Herzegovina": "ba", "Brazil": "br", "Burkina Faso": "bf",
  "Curacao": "cw", "Haiti": "ht", "Suriname": "sr",
  "Cameroon": "cm", "Canada": "ca", "Cape Verde": "cv", "Chile": "cl",
  "China": "cn", "Colombia": "co", "Costa Rica": "cr", "Croatia": "hr",
  "Czech Republic": "cz", "Denmark": "dk", "DR Congo": "cd", "Ecuador": "ec",
  "Egypt": "eg", "England": "gb-eng", "France": "fr", "Germany": "de",
  "Ghana": "gh", "Greece": "gr", "Honduras": "hn", "Hungary": "hu",
  "Iran": "ir", "Iraq": "iq", "Italy": "it", "Ivory Coast": "ci",
  "Jamaica": "jm", "Japan": "jp", "Jordan": "jo", "Mali": "ml",
  "Mexico": "mx", "Morocco": "ma", "Netherlands": "nl", "New Zealand": "nz",
  "Nigeria": "ng", "Northern Ireland": "gb-nir", "Norway": "no", "Panama": "pa",
  "Paraguay": "py", "Peru": "pe", "Poland": "pl", "Portugal": "pt",
  "Qatar": "qa", "Romania": "ro", "Saudi Arabia": "sa", "Scotland": "gb-sct",
  "Senegal": "sn", "Serbia": "rs", "Slovakia": "sk", "Slovenia": "si",
  "South Africa": "za", "South Korea": "kr", "Korea Republic": "kr", "Spain": "es",
  "Sweden": "se", "Switzerland": "ch", "Tunisia": "tn", "Turkey": "tr",
  "Ukraine": "ua", "United States": "us", "USA": "us", "Uruguay": "uy",
  "Uzbekistan": "uz", "Venezuela": "ve", "Wales": "gb-wls",
};

export function flagCode(teamName) {
  if (!teamName) return null;
  return CODES[teamName] || CODES[teamName.trim()] || null;
}

export function flagUrl(teamName, height = 60) {
  const code = flagCode(teamName);
  return code ? `https://flagcdn.com/h${height}/${code}.png` : null;
}

// 2–3 letter fallback used when we have no flag (e.g. "TBD" placeholder teams).
export function initials(teamName) {
  if (!teamName) return "—";
  const words = teamName.replace(/[^A-Za-z ]/g, "").split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words.map((w) => w[0]).join("").slice(0, 3).toUpperCase();
}
