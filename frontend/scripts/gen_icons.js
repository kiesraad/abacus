import fs, { readdirSync } from "fs";
import prettier from "prettier";

async function run() {
  let listing = readdirSync("./lib/icon/svg");

  let result = ["// Generated by npm run gen:icons\n"];

  listing.forEach((file) => {
    if (!file.endsWith(".svg")) return;

    const iconComponent = `Icon${ucfirst(file.replace(".svg", ""))}`;
    let content = fs.readFileSync(`./lib/icon/svg/${file}`, "utf8");
    // replace kebab-case with camelCase in attribute names
    // regex captures two or more groups of letters seperated by dashes, if followed by an equal sign
    content = content.replace(/[A-Za-z]+(-[A-Za-z]+)+(?==)/g, kebabToCamelCase);
    content = content.replace(/^<svg /, `<svg data-icon="${iconComponent}" {...props} `);
    //check for role="img" and add it if not present
    if (!content.includes("role=")) {
      content = content.replace(/^<svg /, '<svg role="img" ');
    }

    result.push(`export const ${iconComponent} = (props:React.SVGAttributes<SVGElement>) => (${content});\n`);
  });

  let s = result.join("\n");
  s = await prettier.format(s, { parser: "typescript" });
  fs.writeFileSync("./lib/icon/generated.tsx", s);
}

run().catch((e) => {
  console.error(e);
});

function ucfirst(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function kebabToCamelCase(s) {
  const keepAsIs = ["aria-label"];

  if (keepAsIs.includes(s)) {
    return s;
  } else {
    return s.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
  }
}
