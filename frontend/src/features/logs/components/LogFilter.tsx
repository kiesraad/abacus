import { t } from "@kiesraad/i18n";
import { IconCross } from "@kiesraad/icon";
import { Button, Checkbox, InputField } from "@kiesraad/ui";

import { LogFilterState } from "../hooks/useAuditLog";
import { LogFilterName, useLogFilterOptions } from "../hooks/useLogFilterOptions";
import cls from "./LogsHomePage.module.css";

interface LogFilterProps {
  onClose: () => void;
  filterState: LogFilterState;
  setSince: (since: string) => void;
  toggleFilter: (filterName: LogFilterName, value: string, checked: boolean) => void;
}

// timestamp to local date string
function timestampToDateString(timestamp: string | undefined): string {
  if (!timestamp) {
    return "";
  }

  const d = new Date();
  const time = new Date(parseInt(timestamp) * 1000 - d.getTimezoneOffset() * 60000);

  return time.toISOString().slice(0, 16);
}

// local date string to timestamp
function dateToTimestampString(date: string): string {
  if (!date) {
    return "";
  }

  const time = new Date(date);

  return Math.round(time.getTime() / 1000).toString();
}

export function LogFilter({ onClose, setSince, filterState, toggleFilter }: LogFilterProps) {
  const options = useLogFilterOptions();

  return (
    <nav>
      <Button variant="secondary" size="sm" onClick={onClose}>
        <IconCross /> {t("log.action.close_filter")}
      </Button>
      <div className={cls.filters}>
        {options.map(([filterName, options]) => (
          <div key={filterName}>
            <h3>{t(`log.filter.${filterName}`)}</h3>
            <ul>
              {options.map(({ value, label }) => (
                <li key={value}>
                  <Checkbox
                    id={`${filterName}-${value}`}
                    label={label}
                    checked={filterState[filterName].includes(value) || false}
                    onChange={(e) => {
                      toggleFilter(filterName, value, e.target.checked);
                    }}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div>
          <InputField
            type="datetime-local"
            name="since"
            fieldWidth="parent"
            value={timestampToDateString(filterState.since)}
            onChange={(e) => {
              setSince(dateToTimestampString(e.target.value));
            }}
            label={t("log.filter.show_events_since")}
          />
        </div>
      </div>
    </nav>
  );
}
