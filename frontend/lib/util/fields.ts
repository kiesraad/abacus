export function fieldNameFromPath(path: string): string {
  let result = "";
  const bits = path.split(".");
  // flatten path at depth 4: data.political_group_votes[1].candidate_votes[1].votes
  if (bits.length === 4) {
    const [, , subsection, field] = bits;
    return `${subsection}.${field}`;
  } else {
    result = bits[bits.length - 1] || "";
  }
  return result || path;
}

export function candidateNumberFromId(id: string) {
  // example of id is candidate_votes[1].votes
  const regexMatchArray = id.match(/\d+/);
  if (regexMatchArray) {
    return parseInt(regexMatchArray[0]) + 1;
  }
  return 0;
}

/**
 *
 * @param fields Fields in Validation result data.<formsection>.<field>
 * @param formSections keys in response data to match
 * @returns true if fields match formSections
 */
export function matchValidationResultWithFormSections(
  fields: string[],
  formSections: string[],
): boolean {
  for (let i = 0; i < fields.length; i++) {
    const field = fields[i];
    if (field) {
      const bits = field.split(".");
      let result = false;
      for (let j = 0; j < formSections.length; j++) {
        const section = formSections[j];
        if (section) {
          if (bits.includes(section)) {
            result = true;
            break;
          }
        }
      }
      if (!result) {
        return false;
      }
    }
  }
  return true;
}

/*
  field examples
  data.voters_counts.proxy_certificate_count
  data.votes_counts.blank_votes_count
  data.political_group_votes[0].total
  data.political_group_votes[0].candidate_votes[0].votes
  data.differences_counts.more_ballots_count
*/

export type FieldSection = {
  name: string;
  index?: number;
};

export function pathToFieldSections(path: string): FieldSection[] {
  const parts = path.split(".");

  const result = parts.map((part) => {
    const name = part.replace(/\[(\d+)\]/, "");
    const indexStr = part.match(/\[(\d+)\]/)?.[1];
    return indexStr
      ? {
          name,
          index: parseInt(indexStr),
        }
      : { name };
  });
  // skip "data"

  return result[0]?.name === "data" ? result.slice(1) : result;
}

export function rootFieldSection(path: string | undefined): { name: string; index?: number } {
  if (!path) return { name: "" };

  const sections = pathToFieldSections(path);
  return sections[0] || { name: "" };
}
