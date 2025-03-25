import { useUserListRequest } from "@/features/users/hooks/useUserListRequest";

import { locale, t, translations } from "@kiesraad/i18n";

export const LogFilterNames = ["event", "level", "user"] as const;
export type LogFilterName = (typeof LogFilterNames)[number];

export type LogFilterOptions = Array<
  [
    LogFilterName,
    Array<{
      value: string;
      label: string;
    }>,
  ]
>;

export function useLogFilterOptions(): LogFilterOptions {
  const users = useUserListRequest();
  const source = translations[locale].log;

  return LogFilterNames.map((filterName) => {
    let values: Array<{
      value: string;
      label: string;
    }> = [];

    if (filterName === "user") {
      if (users.requestState.status === "success") {
        values = users.requestState.data.users.map(({ id, fullname, username, role }) => ({
          value: id.toString(),
          label: `${fullname || username} (${t(role)})`,
        }));
      }
    } else {
      values = Object.entries(source[filterName]).map(([value, label]) => ({
        value,
        label,
      }));
    }

    return [filterName, values];
  });
}
