import { t } from "@/i18n/translate";
import { PollingStationResults, ResolveDifferencesAction } from "@/types/generated/openapi";
import { DataEntrySection, DataEntryStructure, RadioSubsectionOption, SectionValues } from "@/types/types";
import { mapResultsToSectionValues } from "@/utils/dataEntryMapping";

import { DifferencesTable } from "./DifferencesTable";

export interface ResolveDifferencesTablesProps {
  first: PollingStationResults;
  second: PollingStationResults;
  structure: DataEntryStructure;
  action?: ResolveDifferencesAction;
}

export function ResolveDifferencesTables({ first, second, action, structure }: ResolveDifferencesTablesProps) {
  return (
    <>
      {structure.map((section) => (
        <SectionTable key={section.id} section={section} first={first} second={second} action={action} />
      ))}
    </>
  );
}

interface SectionTableProps {
  section: DataEntrySection;
  first: PollingStationResults;
  second: PollingStationResults;
  action?: ResolveDifferencesAction;
}

function SectionTable({ section, first, second, action }: SectionTableProps) {
  let title = section.title;
  const firstValues = mapResultsToSectionValues(section, first);
  const secondValues = mapResultsToSectionValues(section, second);

  return (
    <div>
      {section.subsections.map((subsection, subsectionIdx) => {
        switch (subsection.type) {
          case "heading":
            // override previous title
            title = subsection.title;
            return;
          case "message":
            // message is not rendered
            return;
          case "radio": {
            const headers = [
              t("resolve_differences.headers.field"),
              t("resolve_differences.headers.first_entry"),
              t("resolve_differences.headers.second_entry"),
              t("resolve_differences.headers.description"),
            ];

            const row = {
              code: "",
              first: mapRadioValue(firstValues[subsection.path], subsection.options),
              second: mapRadioValue(secondValues[subsection.path], subsection.options),
              description: subsection.short_title,
            };

            return (
              <DifferencesTable
                key={`${section.id}-${subsectionIdx}`}
                title={title}
                headers={headers}
                rows={[row]}
                action={action}
              />
            );
          }
          case "checkboxes": {
            const headers = [
              t("resolve_differences.headers.field"),
              t("resolve_differences.headers.first_entry"),
              t("resolve_differences.headers.second_entry"),
              t("resolve_differences.headers.description"),
            ];

            const getSelectedOptions = (values: SectionValues) => {
              return subsection.options
                .filter((option) => values[option.path] === "true")
                .map((option) => option.short_label)
                .join(", ");
            };

            const row = {
              code: "",
              first: getSelectedOptions(firstValues) || "-",
              second: getSelectedOptions(secondValues) || "-",
              description: subsection.short_title,
            };

            return (
              <DifferencesTable
                key={`${section.id}-${subsectionIdx}`}
                title={title}
                headers={headers}
                rows={[row]}
                action={action}
              />
            );
          }
          case "inputGrid": {
            const headers = [
              subsection.headers[0],
              t("resolve_differences.headers.first_entry"),
              t("resolve_differences.headers.second_entry"),
              subsection.headers[2],
            ];

            const rows = subsection.rows.map((row) => ({
              code: row.code,
              first: firstValues[row.path],
              second: secondValues[row.path],
              description: row.title,
            }));

            return (
              <DifferencesTable
                key={`${section.id}-${subsectionIdx}`}
                title={title}
                headers={headers}
                rows={rows}
                action={action}
              />
            );
          }
        }
      })}
    </div>
  );
}

function mapRadioValue(value: string | undefined, options: RadioSubsectionOption[]): string {
  if (!value) return "";
  const option = options.find((option) => option.value === value);
  return option ? option.short_label : value;
}
