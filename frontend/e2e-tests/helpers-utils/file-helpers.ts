import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";

const TEMP_DIR = "./e2e-tests/temp/";

export interface EmlTestFile {
  filename: string;
  path: string;
}

type Eml = "eml110a" | "eml110b" | "eml230b";

const repeatTag: Record<Eml, string> = {
  eml110a: "kr:RegisteredParty",
  eml110b: "PollingPlace",
  eml230b: "Candidate",
};

/**
 * Generate an EML file with a certain minimum size, to test file size restrictions.
 */
export async function generateEml(eml: Eml, minimumSize: number): Promise<EmlTestFile> {
  // Define start and end tag of the to-be-repeated tag
  const tag = repeatTag[eml];
  const startTag = `<${tag}`;
  const endTag = `</${tag}>`;

  // Split an existing EML into everything before the tags, one of the tags, and everything after the tags
  const content = await readFile(`../backend/src/eml/tests/${eml}_test.eml.xml`, "utf8");
  const before = content.slice(0, content.indexOf(startTag));
  const oneTag = content.slice(content.indexOf(startTag), content.indexOf(endTag) + endTag.length);
  const after = content.slice(content.lastIndexOf(endTag) + endTag.length);

  // Calculate how many tags we need and repeat the tag in the new content
  const repeats = Math.ceil((minimumSize - before.length - after.length) / oneTag.length);
  const largeContent = before + oneTag.repeat(repeats) + after;

  // Write the new content to a temporary file
  await mkdir(TEMP_DIR, { recursive: true });
  const filename = `${eml}_invalid_file_size-${randomUUID()}.eml.xml`;
  const path = TEMP_DIR + filename;
  await writeFile(path, largeContent, "utf8");

  return { filename, path };
}
