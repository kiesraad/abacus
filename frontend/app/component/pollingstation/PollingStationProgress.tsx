import { useElection } from "@kiesraad/api";
import { ProgressList } from "@kiesraad/ui";

import { Link, useLocation, useParams } from "react-router-dom";

export function PollingStationProgress() {
  const { id, listNumber } = useParams();
  const { election } = useElection();
  const { pathname } = useLocation();

  const targetForm = currentSectionFromPath(pathname);

  const lists = election.political_groups;

  return (
    <ProgressList>
      <ProgressList.Item key="recount" status="accept" active={targetForm === "recount"}>
        <Link to={`/input/${id}/recount`}>Is er herteld?</Link>
      </ProgressList.Item>
      <ProgressList.Item key="numbers" status="idle" active={targetForm === "numbers"}>
        <Link to={`/input/${id}/numbers`}>Aantal kiezers en stemmen</Link>
      </ProgressList.Item>
      <ProgressList.Item key="differences" status="idle" active={targetForm === "differences"}>
        <Link to={`/input/${id}/differences`}>Verschillen</Link>
      </ProgressList.Item>
      <ProgressList.Ruler key="ruler1" />
      {lists.map((list, index) => {
        const listId = `${index + 1}`;
        return (
          <ProgressList.Item key={`list${listId}`} status="idle" active={listNumber === listId}>
            <Link to={`/input/${id}/list/${listId}`}>{list.name}</Link>
          </ProgressList.Item>
        );
      })}
      <ProgressList.Ruler key="ruler2" />
      <ProgressList.Item key="save" status="idle" active={targetForm === "save"}>
        <Link to={`/input/${id}/save`}>Controleren en opslaan</Link>
      </ProgressList.Item>
    </ProgressList>
  );
}

function currentSectionFromPath(pathname: string): string {
  //3 deep;
  const pathParts = pathname.split("/");
  if (pathParts.length >= 3) {
    return pathParts[3] || "";
  }
  return "";
}
