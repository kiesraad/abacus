import * as React from "react";
import { Link, useParams } from "react-router-dom";

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

  const { formState, values } = usePollingStationFormController();

  const menuStatusForFormSection = React.useCallback(
    (formSection?: FormSection): MenuStatus => {
      if (!formSection) return "idle";

      if (formSection.errors.length > 0) {
        return "error";
      }
      if (formSection.warnings.length > 0 && !formSection.acceptWarnings) {
        return "warning";
      }

      if (formSection.id === formState.furthest) {
        return "unsaved";
      }
      const currentSection = formState.sections[formState.furthest];
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

  const lists = election.political_groups;
  const currentIndex = formState.sections[formState.furthest]?.index || 0;

  return (
    <ProgressList>
      <ProgressList.Fixed>
        <ProgressList.Item
          id="list-item-recounted"
          key="recounted"
          status="accept"
          active={formState.current === "recounted"}
        >
          {formState.current !== "recounted" ? (
            <Link to={`/elections/${election.id}/data-entry/${pollingStationId}/recounted`}>
              <span>Is er herteld?</span>
            </Link>
          ) : (
            <span>Is er herteld?</span>
          )}
        </ProgressList.Item>
        <ProgressList.Item
          key="voters-and-votes"
          id="list-item-voters-and-votes"
          status={menuStatusForFormSection(formState.sections.voters_votes_counts)}
          disabled={formState.sections.voters_votes_counts.index > currentIndex}
          active={formState.current === "voters_votes_counts"}
        >
          {formState.current !== "voters_votes_counts" &&
          formState.sections.voters_votes_counts.index <= currentIndex ? (
            <Link to={`/elections/${election.id}/data-entry/${pollingStationId}/voters-and-votes`}>
              <span>Aantal kiezers en stemmen</span>
            </Link>
          ) : (
            <span>Aantal kiezers en stemmen</span>
          )}
        </ProgressList.Item>
        <ProgressList.Item
          key="differences"
          id="list-item-differences"
          disabled={formState.sections.differences_counts.index > currentIndex}
          status={menuStatusForFormSection(formState.sections.differences_counts)}
          active={formState.current === "differences_counts"}
        >
          {formState.current !== "differences_counts" && formState.sections.differences_counts.index <= currentIndex ? (
            <Link to={`/elections/${election.id}/data-entry/${pollingStationId}/differences`}>
              <span>Verschillen</span>
            </Link>
          ) : (
            <span>Verschillen</span>
          )}
        </ProgressList.Item>
      </ProgressList.Fixed>

      <ProgressList.Scroll>
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
              active={formState.current === formSection.id}
              scrollIntoView
            >
              {formState.current !== formSection.id && formSection.index <= currentIndex ? (
                <Link to={`/elections/${election.id}/data-entry/${pollingStationId}/list/${listId}`}>
                  <span>
                    Lijst {list.number} - {list.name}
                  </span>
                </Link>
              ) : (
                <span>
                  Lijst {list.number} - {list.name}
                </span>
              )}
            </ProgressList.Item>
          );
        })}
      </ProgressList.Scroll>
      <ProgressList.Fixed>
        <ProgressList.Item
          key="save"
          id="list-item-save"
          status={menuStatusForFormSection(formState.sections.save)}
          active={formState.current === "save"}
          disabled={formState.furthest !== "save"}
        >
          {formState.current !== "save" && formState.furthest === "save" ? (
            <Link to={`/elections/${election.id}/data-entry/${pollingStationId}/save`}>
              <span>Controleren en opslaan</span>
            </Link>
          ) : (
            <span>Controleren en opslaan</span>
          )}
        </ProgressList.Item>
      </ProgressList.Fixed>
    </ProgressList>
  );
}
