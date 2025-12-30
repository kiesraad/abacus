import fs from "node:fs";

import { translations } from "@/i18n/i18n";

// create a translations directory if none exists
if (!fs.existsSync("./translations")) {
  fs.mkdirSync("./translations");
}

// flatten the translations object
function flatten(obj, parent, result = {}) {
  for (const key in obj) {
    const path = parent ? `${parent}.${key}` : key;

    if (typeof obj[key] === "object") {
      flatten(obj[key], path, result);
    } else {
      result[path] = obj[key];
    }
  }

  return result;
}

// create a po file for each locale
Object.entries(translations).forEach(([locale, entries]) => {
  // flatten the entries
  const flatTranslations = flatten(entries);

  // create po value
  const po = Object.entries(flatTranslations)
    .map(([key, value]) => {
      const escapedValue = value.replace(/\n/g, "\\n");

      return `msgid "${key}"\nmsgstr "${escapedValue}"\n`;
    })
    .join("\n");

  // add po headers
  const poHeader = `msgid ""
msgstr ""
"Project-Id-Version: Abacus\\n"
"Language: ${locale}\\n"
"MIME-Version: 1.0\\n"
"Content-Type: text/plain; charset=UTF-8\\n"
"Content-Transfer-Encoding: 8bit\\n"\n\n`;

  fs.writeFileSync(`./translations/${locale}.po`, `${poHeader}${po}`);
  console.log(`Wrote ${Object.keys(flatTranslations).length} entries to ./translations/${locale}.po`);
});
