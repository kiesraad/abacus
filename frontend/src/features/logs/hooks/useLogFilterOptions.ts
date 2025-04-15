import { useInitialApiGet } from "@/api/useInitialApiGet";
import { locale, translations } from "@/lib/i18n";
import { AUDIT_LOG_LIST_USERS_REQUEST_PATH, AuditLogUser } from "@/types/generated/openapi";

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
  const path: AUDIT_LOG_LIST_USERS_REQUEST_PATH = `/api/log-users`;
  const { requestState: usersRequestState } = useInitialApiGet<AuditLogUser[]>(path);
  const source = translations[locale].log;

  return LogFilterNames.map((filterName) => {
    let values: Array<{
      value: string;
      label: string;
    }> = [];

    if (filterName === "user") {
      if (usersRequestState.status === "success") {
        values = usersRequestState.data.map(({ id, username }) => ({
          value: id.toString(),
          label: `${id}, ${username}`,
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
