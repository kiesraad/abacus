import { Link, useLocation } from "react-router";
import { ProgressList } from "@/components/ui/ProgressList/ProgressList";

import { t } from "@/i18n/translate";
import { useElectionCreateContext } from "../hooks/useElectionCreateContext";

interface ElectionCreateFormSection {
  key: string;
  label: string;
  path: string;
}

const formSections: ElectionCreateFormSection[] = [
  { key: "election_definition", label: t("election_definition"), path: "create" },
  { key: "polling_station_role", label: t("polling_station.role"), path: "create/polling-station-role" },
  { key: "list_of_candidates", label: t("candidate.list.plural"), path: "create/list-of-candidates" },
  { key: "polling_stations", label: t("polling_station.title.plural"), path: "create/polling-stations" },
  { key: "counting_method_type", label: t("counting_method_type"), path: "create/counting-method-type" },
  { key: "number_of_voters", label: t("number_of_voters"), path: "create/number-of-voters" },
  { key: "check_and_save", label: t("election.check_and_save.title"), path: "create/check-and-save" },
];

export function ElectionNav() {
  const location = useLocation();
  const { state } = useElectionCreateContext();

  // Update menu for CSB
  if (state.electionCategory === "Central") {
    formSections.splice(4, 3);
  }

  const currentFormSection = formSections.findIndex((formSection) => {
    return location.pathname.endsWith(formSection.path);
  });
  const fixedSections = formSections.slice(0, formSections.length - 1);

  return (
    <ProgressList>
      <ProgressList.Fixed>
        {fixedSections.map((formSection, index) => (
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
          disabled={currentFormSection !== -1}
          active={currentFormSection === -1}
        >
          <span>{t("election.check_and_save.title")}</span>
        </ProgressList.Item>
      </ProgressList.Fixed>
    </ProgressList>
  );
}
