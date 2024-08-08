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
        {targetForm !== "recounted" ? (
          <Link to={`/${election.id}/input/${pollingStationId}/recounted`}>Is er herteld?</Link>
        ) : (
          <span>Is er herteld?</span>
        )}
      </ProgressList.Item>
      <ProgressList.Item key="numbers" status="idle" active={targetForm === "numbers"}>
        {targetForm !== "numbers" ? (
          <Link to={`/${election.id}/input/${pollingStationId}/numbers`}>
            Aantal kiezers en stemmen
          </Link>
        ) : (
          <span>Aantal kiezers en stemmen</span>
        )}
      </ProgressList.Item>
      <ProgressList.Item key="differences" status="idle" active={targetForm === "differences"}>
        {targetForm !== "differences" ? (
          <Link to={`/${election.id}/input/${pollingStationId}/differences`}>Verschillen</Link>
        ) : (
          <span>Verschillen</span>
        )}
      </ProgressList.Item>
      <ProgressList.Ruler key="ruler1" />
      {lists.map((list, index) => {
        const listId = `${index + 1}`;
        return (
          <ProgressList.Item key={`list${listId}`} status="idle" active={listNumber === listId}>
            {listNumber !== listId ? (
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
      <ProgressList.Item key="save" status="idle" active={targetForm === "save"}>
        {targetForm !== "save" ? (
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
