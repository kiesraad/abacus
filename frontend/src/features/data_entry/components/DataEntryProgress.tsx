import * as React from "react";
import { Link } from "react-router";

import { ProgressList } from "@/components/ui/ProgressList/ProgressList";
import { useElection } from "@/hooks/election/useElection";
import { useNumericParam } from "@/hooks/useNumericParam";
import { t } from "@/i18n/translate";
import { FormSectionId } from "@/types/types";
import { MenuStatus } from "@/types/ui";

import { useDataEntryContext } from "../hooks/useDataEntryContext";
import { FormSection } from "../types/types";
import { isFormSectionEmpty } from "../utils/dataEntryUtils";
import { getUrlForFormSectionID } from "../utils/utils";

export function DataEntryProgress() {
  const pollingStationId = useNumericParam("pollingStationId");
  const { election } = useElection();

  const { dataEntryStructure, formState, pollingStationResults, entryNumber, sectionId } = useDataEntryContext();

  const menuStatusForFormSection = React.useCallback(
    (formSection?: FormSection): Exclude<MenuStatus, "active"> => {
      if (!formSection) return "idle";

      if (!formSection.errors.isEmpty()) {
        return "error";
      }
      if (!formSection.warnings.isEmpty() && !formSection.acceptErrorsAndWarnings) {
        return "warning";
      }
      if (formSection.id === formState.furthest) {
        return "unsaved";
      }
      const furthestSection = formState.sections[formState.furthest];
      if (furthestSection) {
        //check if section has been left empty
        if (formSection.index < furthestSection.index) {
          if (isFormSectionEmpty(formSection, pollingStationResults)) {
            return "empty";
          }
        }
      }

      if (formSection.errors.isEmpty() && formSection.isSaved) {
        return "accept";
      }

      return "idle";
    },
    [formState, pollingStationResults],
  );

  const currentIndex = formState.sections[formState.furthest]?.index || 0;

  const renderProgressItem = React.useCallback(
    (
      section: { id: FormSectionId; short_title: string },
      options: {
        scrollIntoView?: boolean;
        disabled?: boolean;
      } = {},
    ) => {
      const formSection = formState.sections[section.id];
      if (!formSection) return null;

      const isActive = sectionId === section.id;
      const canNavigate = !isActive && formSection.index <= currentIndex;
      const isDisabled = options.disabled ?? formSection.index > currentIndex;

      return (
        <ProgressList.Item
          key={section.id}
          id={`list-item-${section.id}`}
          status={menuStatusForFormSection(formSection)}
          active={isActive}
          disabled={isDisabled}
          scrollIntoView={options.scrollIntoView}
        >
          {canNavigate ? (
            <Link to={getUrlForFormSectionID(election.id, pollingStationId, entryNumber, section.id)}>
              <span>{section.short_title}</span>
            </Link>
          ) : (
            <span>{section.short_title}</span>
          )}
        </ProgressList.Item>
      );
    },
    [formState, currentIndex, sectionId, menuStatusForFormSection, election.id, pollingStationId, entryNumber],
  );

  // Separate sections into fixed and scrollable groups
  const fixedSections = dataEntryStructure.filter((section) => !section.id.startsWith("political_group_votes_"));
  const politicalGroupSections = dataEntryStructure.filter((section) =>
    section.id.startsWith("political_group_votes_"),
  );

  return (
    <ProgressList>
      <ProgressList.Fixed>{fixedSections.map((section) => renderProgressItem(section))}</ProgressList.Fixed>

      <ProgressList.Scroll>
        {politicalGroupSections.map((section) => renderProgressItem(section, { scrollIntoView: true }))}
      </ProgressList.Scroll>

      <ProgressList.Fixed>
        {renderProgressItem(
          { id: "save", short_title: t("check_and_save.title") },
          {
            disabled: formState.furthest !== "save",
          },
        )}
      </ProgressList.Fixed>
    </ProgressList>
  );
}
