import { PollingStationType } from "@kiesraad/api";

export const labelForPollingStationType = withEntries<{ [K in PollingStationType]: string }>({
  FixedLocation: "Vaste locatie",
  Special: "Bijzonder",
  Mobile: "Mobiel",
});

function withEntries<T extends { [K in keyof T]: T[K] }>(
  obj: T,
): T & { entries: { key: keyof T; value: T[keyof T] }[] } {
  const entries = (Object.keys(obj) as Array<keyof T>).map((key) => ({
    key,
    value: obj[key],
  }));
  return {
    ...obj,
    entries,
  };
}
