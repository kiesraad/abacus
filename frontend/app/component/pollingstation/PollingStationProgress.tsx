import { Link, useLocation, useParams } from "react-router-dom";

import { useElection } from "@kiesraad/api";
import { ProgressList } from "@kiesraad/ui";

export function PollingStationProgress() {
  const { pollingStationId, listNumber } = useParams();
  const { election } = useElection();
  const { pathname } = useLocation();

  const targetForm = currentSectionFromPath(pathname);

  const lists = election.political_groups;

  return (
    <ProgressList>
      <ProgressList.Item key="recounted" status="accept" active={targetForm === "recounted"}>
        <Link to={`/${election.id}/input/${pollingStationId}/recounted`}>Is er herteld?</Link>
      </ProgressList.Item>
      <ProgressList.Item key="numbers" status="idle" active={targetForm === "numbers"}>
        <Link to={`/${election.id}/input/${pollingStationId}/numbers`}>
          Aantal kiezers en stemmen
        </Link>
      </ProgressList.Item>
      <ProgressList.Item key="differences" status="idle" active={targetForm === "differences"}>
        <Link to={`/${election.id}/input/${pollingStationId}/differences`}>Verschillen</Link>
      </ProgressList.Item>
      <ProgressList.Ruler key="ruler1" />
      {lists.map((list, index) => {
        const listId = `${index + 1}`;
        return (
          <ProgressList.Item key={`list${listId}`} status="idle" active={listNumber === listId}>
            <Link to={`/${election.id}/input/${pollingStationId}/list/${listId}`}>
              Lijst {list.number} - {list.name}
            </Link>
          </ProgressList.Item>
        );
      })}
      <ProgressList.Ruler key="ruler2" />
      <ProgressList.Item key="save" status="idle" active={targetForm === "save"}>
        <Link to={`/${election.id}/input/${pollingStationId}/save`}>Controleren en opslaan</Link>
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
