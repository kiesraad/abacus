import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useParams } from "react-router-dom";

import { useElectionDataRequest } from "@kiesraad/api";
import { IconCross } from "@kiesraad/icon";
import {
  Badge,
  Button,
  Modal,
  PollingStationNumber,
  ProgressList,
  WorkStationNumber,
} from "@kiesraad/ui";

export function PollingStationLayout() {
  const { electionId, pollingStationId, listNumber } = useParams();
  const [openModal, setOpenModal] = useState(false);
  const { data } = useElectionDataRequest({
    election_id: parseInt(electionId || ""),
  });
  const [lists, setLists] = useState<string[]>([]);
  const { pathname } = useLocation();

  const targetForm = currentSectionFromPath(pathname);

  useEffect(() => {
    if (data) {
      const parties: string[] = [];
      data.political_groups?.forEach((group: { name: string }) => parties.push(group.name));
      setLists(parties);
    }
  }, [data]);

  function changeDialog() {
    setOpenModal(!openModal);
  }

  return (
    <>
      <header>
        <section>
          <PollingStationNumber>{pollingStationId}</PollingStationNumber>
          <h1>Fluisterbosdreef 8</h1>
          <Badge type="first_entry" />
        </section>
        <section>
          <Button variant="secondary" size="sm" onClick={changeDialog} rightIcon={<IconCross />}>
            Invoer afbreken
          </Button>
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>
      <main>
        <nav>
          <ProgressList>
            <ProgressList.Item key="recounted" status="accept" active={targetForm === "recounted"}>
              <Link to={`/${electionId}/input/${pollingStationId}/recounted`}>Is er herteld?</Link>
            </ProgressList.Item>
            <ProgressList.Item key="numbers" status="idle" active={targetForm === "numbers"}>
              <Link to={`/${electionId}/input/${pollingStationId}/numbers`}>
                Aantal kiezers en stemmen
              </Link>
            </ProgressList.Item>
            <ProgressList.Item
              key="differences"
              status="idle"
              active={targetForm === "differences"}
            >
              <Link to={`/${electionId}/input/${pollingStationId}/differences`}>Verschillen</Link>
            </ProgressList.Item>
            <ProgressList.Ruler key="ruler1" />
            {lists.map((list, index) => {
              const listId = `${index + 1}`;
              return (
                <ProgressList.Item
                  key={`list${listId}`}
                  status="idle"
                  active={listNumber === listId}
                >
                  <Link to={`/${electionId}/input/${pollingStationId}/list/${listId}`} state={data}>
                    {list}
                  </Link>
                </ProgressList.Item>
              );
            })}
            <ProgressList.Ruler key="ruler2" />
            <ProgressList.Item key="save" status="idle" active={targetForm === "save"}>
              <Link to={`/${electionId}/input/${pollingStationId}/save`}>
                Controleren en opslaan
              </Link>
            </ProgressList.Item>
          </ProgressList>
        </nav>
        <article>
          <Outlet />
        </article>
      </main>
      {openModal && (
        <Modal onClose={changeDialog}>
          <h2>Wat wil je doen met je invoer?</h2>
          <p>
            Ga je op een later moment verder met het invoeren van dit stembureau? Dan kan je de
            invoer die je al hebt gedaan bewaren.
            <br />
            <br />
            Twijfel je? Overleg dan met de coördinator.
          </p>
          <nav>
            <Button size="lg">Invoer bewaren</Button>
            <Button size="lg" variant="secondary">
              Niet bewaren
            </Button>
          </nav>
        </Modal>
      )}
    </>
  );
}

function currentSectionFromPath(pathname: string): string {
  //3 deep;
  const pathParts = pathname.split("/");
  if (pathParts.length >= 4) {
    return pathParts[4] || "";
  }
  return "";
}
