import { t } from "@kiesraad/i18n";
import { IconCross } from "@kiesraad/icon";
import { Button, Checkbox, StickyNav } from "@kiesraad/ui";

import cls from "../LogsHomePage.module.css";
import { getFilterOptions, LogFilterName } from "./FilterOptions";

interface LogFilterProps {
  onClose: () => void;
  filterState: Record<LogFilterName, string[]>;
  toggleFilter: (filterName: LogFilterName, value: string, checked: boolean) => void;
}

export function LogFilter({ onClose, filterState, toggleFilter }: LogFilterProps) {
  const options = getFilterOptions();

  return (
    <StickyNav>
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
                    id={value}
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
    </StickyNav>
  );
}
