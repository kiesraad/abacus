import { Link, useLocation } from "react-router";
import { ProgressList } from "@/components/ui/ProgressList/ProgressList";

import { t } from "@/i18n/translate";
import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

interface ElectionCreateFormSection {
  key: string;
  label: string;
  path: string;
  hidden: boolean;
}

const sections: ElectionCreateFormSection[] = [
  { key: "election_definition", label: t("election_definition"), path: "create", hidden: false },
  {
    key: "electoral_committee_role",
    label: t("electoral_committee_role.role"),
    path: "create/electoral-committee-role",
    hidden: false,
  },
  { key: "list_of_candidates", label: t("candidate.list.plural"), path: "create/list-of-candidates", hidden: false },
  { key: "polling_stations", label: t("polling_station.title.plural"), path: "create/polling-stations", hidden: false },
  { key: "counting_method_type", label: t("counting_method_type"), path: "create/counting-method-type", hidden: false },
  { key: "number_of_voters", label: t("number_of_voters"), path: "create/number-of-voters", hidden: false },
  { key: "check_and_save", label: t("election.check_and_save.title"), path: "create/check-and-save", hidden: false },
];

export function ElectionNav() {
  const location = useLocation();
  const { state } = useElectionCreateContext();
  const formSections: ElectionCreateFormSection[] = [];

  sections.forEach((formSection) => {
    formSections.push(formSection);
  });

  // Update menu for CSB
  if (state.electionRole === "CSB") {
    // Hide items instead of deleting them, so that we can show them when role changes from CSB to GSB.
    formSections.forEach((formSection) => {
      if (
        formSection.key === "polling_stations" ||
        formSection.key === "counting_method_type" ||
        formSection.key === "number_of_voters"
      ) {
        formSection.hidden = true;
      }
    });
  }

  // Show all menu items.
  if (state.electionRole === "GSB") {
    formSections.forEach((formSection) => {
      if (formSection.hidden) {
        formSection.hidden = false;
      }
    });
  }

  const currentFormSection = formSections.findIndex((formSection) => {
    return location.pathname.endsWith(formSection.path);
  });
  const fixedSections = formSections.slice(0, formSections.length - 1);

  return (
    <ProgressList>
      <ProgressList.Fixed>
        {fixedSections
          .filter((formSection) => !formSection.hidden)
          .map((formSection, index) => (
            <ProgressList.Item
              key={formSection.key}
              status={index < currentFormSection || currentFormSection === -1 ? "accept" : "idle"}
              active={index === currentFormSection}
              disabled={index > currentFormSection && currentFormSection !== -1}
            >
              {index >= currentFormSection ? (
                <span>{formSection.label}</span>
              ) : (
                <Link to={`/elections/${formSection.path}`}>
                  <span>{formSection.label}</span>
                </Link>
              )}
            </ProgressList.Item>
          ))}
      </ProgressList.Fixed>

      <ProgressList.Fixed>
        <ProgressList.Item
          key="check_and_save"
          status="idle"
          disabled={currentFormSection !== formSections.length - 1}
          active={currentFormSection === formSections.length - 1}
        >
          <span>{t("election.check_and_save.title")}</span>
        </ProgressList.Item>
      </ProgressList.Fixed>
    </ProgressList>
  );
}
