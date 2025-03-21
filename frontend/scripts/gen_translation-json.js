import fs from "fs";
import readline from "readline";

// let the user confirm that all current translation json files will be overwritten
const io = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

io.question("Do you want to import .po files and overwrite all translation json files? (y/n) ", function (ans) {
  if (ans == "y" || ans == "yes") {
    importPoFiles();
  } else {
    console.log("Ok, bye");
  }
  // pause the interface so the program can exit
  io.pause();
});

// naively parse a .po file to a flat object
function parsePoFile(contents) {
  const lines = contents.split("\n");
  const translations = {};

  let msgid = "";
  let msgstr = "";

  for (const line of lines) {
    if (line.startsWith("msgid")) {
      msgid = line.replace("msgid", "").trim().replace(/^"|"$/g, "");
    } else if (line.startsWith("msgstr")) {
      msgstr = line.replace("msgstr", "").trim().replace(/^"|"$/g, "").replace(/\\n/g, "\n");
      translations[msgid] = msgstr;
    }
  }

  return translations;
}

// expand flat record to nested object
function expandObject(object) {
  const result = {};

  for (const key in object) {
    const keys = key.split(".");
    let current = result;

    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];

      if (i === keys.length - 1) {
        current[k] = object[key];
      } else {
        current[k] = current[k] || {};
        current = current[k];
      }
    }
  }

  return result;
}

function importPoFiles() {
  // loop over translation directory and read .po files to a string
  const translations = fs.readdirSync("./translations").reduce((acc, file) => {
    if (file.endsWith(".po")) {
      const locale = file.replace(".po", "");
      const content = fs.readFileSync(`./translations/${file}`, "utf8");
      acc[locale] = expandObject(parsePoFile(content));
    }

    return acc;
  }, {});

  // write the translations to a json file, based on the root keys
  for (const locale in translations) {
    const generic = {};

    for (const key in translations[locale]) {
      if (typeof translations[locale][key] === "string") {
        generic[key] = translations[locale][key];
      } else {
        fs.writeFileSync(
          `./src/lib/i18n/locales/${locale}/${key}.json`,
          JSON.stringify(translations[locale][key], null, 2) + "\n",
        );
        console.log(`Wrote ${translations[locale][key].length} entries to ${locale}/${key}.json`);
      }
    }

    fs.writeFileSync(`./src/lib/i18n/locales/${locale}/generic.json`, JSON.stringify(generic, null, 2) + "\n");
    console.log(`Wrote ${generic.length} entries to ${locale}/generic.json`);
  }
}
