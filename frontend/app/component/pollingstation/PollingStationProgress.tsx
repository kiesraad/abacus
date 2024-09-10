import * as React from "react";
import { Link, useLocation, useParams } from "react-router-dom";

import {
  FormSection,
  FormSectionID,
  isFormSectionEmpty,
  useElection,
  usePollingStationFormController,
} from "@kiesraad/api";
import { MenuStatus, ProgressList } from "@kiesraad/ui";

export function PollingStationProgress() {
  const { pollingStationId } = useParams();
  const { election } = useElection();
  const { pathname } = useLocation();

  const { formState, values } = usePollingStationFormController();

  const menuStatusForFormSection = React.useCallback(
    (formSection?: FormSection): MenuStatus => {
      if (!formSection) return "idle";

      if (formSection.errors.length > 0) {
        return "error";
      }
      if (formSection.warnings.length > 0) {
        return "warning";
      }

      if (formSection.id === formState.current) {
        return "unsaved";
      }
      const currentSection = formState.sections[formState.current];
      if (currentSection) {
        //check if section has been left empty
        if (formSection.index < currentSection.index) {
          if (isFormSectionEmpty(formSection, values)) {
            return "empty";
          }
        }
      }

      if (formSection.errors.length === 0 && formSection.isSaved) {
        return "accept";
      }

      return "idle";
    },
    [formState, values],
  );

  const targetForm = currentSectionFromPath(pathname);

  const lists = election.political_groups;
  const currentIndex = formState.sections[formState.current]?.index || 0;

  return (
    <ProgressList>
      <ProgressList.Item
        id="list-item-recounted"
        key="recounted"
        status="accept"
        active={formState.active === "recounted"}
      >
        {formState.active !== "recounted" ? (
          <Link to={`/${election.id}/input/${pollingStationId}/recounted`}>Is er herteld?</Link>
        ) : (
          <span>Is er herteld?</span>
        )}
      </ProgressList.Item>
      <ProgressList.Item
        key="numbers"
        id="list-item-numbers"
        status={menuStatusForFormSection(formState.sections.voters_votes_counts)}
        disabled={formState.sections.voters_votes_counts.index > currentIndex}
        active={formState.active === "voters_votes_counts"}
      >
        {formState.active !== "voters_votes_counts" ? (
          <Link to={`/${election.id}/input/${pollingStationId}/numbers`}>Aantal kiezers en stemmen</Link>
        ) : (
          <span>Aantal kiezers en stemmen</span>
        )}
      </ProgressList.Item>
      <ProgressList.Item
        key="differences"
        id="list-item-differences"
        disabled={formState.sections.differences_counts.index > currentIndex}
        status={menuStatusForFormSection(formState.sections.differences_counts)}
        active={formState.active === "differences_counts"}
      >
        {formState.active !== "differences_counts" ? (
          <Link to={`/${election.id}/input/${pollingStationId}/differences`}>Verschillen</Link>
        ) : (
          <span>Verschillen</span>
        )}
      </ProgressList.Item>
      <ProgressList.Ruler key="ruler1" />
      {lists.map((list, index) => {
        const listId = `${index + 1}`;
        const formSection = formState.sections[`political_group_votes_${listId}` as FormSectionID];
        if (!formSection) return null;
        return (
          <ProgressList.Item
            key={`list${listId}`}
            id={`list-item-pg-${listId}`}
            disabled={formSection.index > currentIndex}
            status={menuStatusForFormSection(formSection)}
            active={formState.active === formSection.id}
          >
            {formState.active !== formSection.id ? (
              <Link to={`/${election.id}/input/${pollingStationId}/list/${listId}`}>
                Lijst {list.number} - {list.name}
              </Link>
            ) : (
              <span>
                Lijst {list.number} - {list.name}
              </span>
            )}
          </ProgressList.Item>
        );
      })}
      <ProgressList.Ruler key="ruler2" />
      <ProgressList.Item
        key="save"
        id="list-item-save"
        status="idle"
        active={targetForm === "save"}
        disabled={!formState.isCompleted}
      >
        {formState.active !== "save" && formState.isCompleted ? (
          <Link to={`/${election.id}/input/${pollingStationId}/save`}>Controleren en opslaan</Link>
        ) : (
          <span>Controleren en opslaan</span>
        )}
      </ProgressList.Item>
    </ProgressList>
  );
}

function currentSectionFromPath(pathname: string): string {
  //4 deep;
  const pathParts = pathname.split("/");
  if (pathParts.length >= 4) {
    return pathParts[4] || "";
  }
  return "";
}
