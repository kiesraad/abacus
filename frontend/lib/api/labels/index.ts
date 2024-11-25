import { PollingStationType } from "@kiesraad/api";
import { t } from "@kiesraad/i18n";

export const labelForPollingStationType = withEntries<{ [K in PollingStationType]: string }>({
  FixedLocation: t("polling_station.type.FixedLocation"),
  Special: t("polling_station.type.Special"),
  Mobile: t("polling_station.type.Mobile"),
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
