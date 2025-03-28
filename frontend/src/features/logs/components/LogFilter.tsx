import { t } from "@kiesraad/i18n";
import { IconCross } from "@kiesraad/icon";
import { Button, Checkbox, InputField } from "@kiesraad/ui";
import { localDateToUtc, utcToLocalDate } from "@kiesraad/util";

import { LogFilterState } from "../hooks/useAuditLog";
import { LogFilterName, useLogFilterOptions } from "../hooks/useLogFilterOptions";
import cls from "./LogsHomePage.module.css";

interface LogFilterProps {
  onClose: () => void;
  filterState: LogFilterState;
  setSince: (since: string) => void;
  toggleFilter: (filterName: LogFilterName, value: string, checked: boolean) => void;
}

export function LogFilter({ onClose, setSince, filterState, toggleFilter }: LogFilterProps) {
  const options = useLogFilterOptions();

  return (
    <nav>
      <Button variant="secondary" onClick={onClose}>
        <IconCross /> {t("log.action.close_filter")}
      </Button>
      <div className={cls.filters}>
        {options.map(([filterName, options]) => (
          <div key={filterName}>
            <h3>{t(`log.header.${filterName}`)}</h3>
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
            value={filterState.since ? utcToLocalDate(filterState.since).slice(0, 16) : ""}
            onChange={(e) => {
              setSince(e.target.value ? localDateToUtc(e.target.value) : "");
            }}
            label={t("log.header.since")}
          />
        </div>
      </div>
    </nav>
  );
}
