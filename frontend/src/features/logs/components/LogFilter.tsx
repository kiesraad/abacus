import { IconCross } from "@/components/generated/icons";
import { Button } from "@/components/ui/Button/Button";
import { Checkbox } from "@/components/ui/CheckboxAndRadio/CheckboxAndRadio";
import { InputField } from "@/components/ui/InputField/InputField";
import { t } from "@/i18n/translate";

import { LogFilterState } from "../hooks/useAuditLog";
import { LogFilterName, useLogFilterOptions } from "../hooks/useLogFilterOptions";
import { dateToTimestampString, timestampToDateString } from "../utils/dateTime";
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
      <Button variant="secondary" size="sm" onClick={onClose}>
        <IconCross /> {t("log.action.close_filter")}
      </Button>
      <div className={cls.filters}>
        <div>
          <InputField
            id="since"
            type="datetime-local"
            name="since"
            fieldWidth="parent"
            value={timestampToDateString(filterState.since)}
            onChange={(e) => {
              setSince(dateToTimestampString(e.target.value));
            }}
            label={t("log.filter.show_events_since")}
            margin="mb-lg"
          />
        </div>
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
      </div>
    </nav>
  );
}
