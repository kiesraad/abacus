import { useState, useEffect } from "react";
import { Link, Outlet, useParams } from "react-router-dom";

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
  const { id, listNumber } = useParams();
  // TODO: Set default targetForm correctly once all pages are implemented
  const targetForm: string = "numbers";
  const [openModal, setOpenModal] = useState(false);
  const { data } = useElectionDataRequest({
    election_id: parseInt(id || ""),
  });
  const [lists, setLists] = useState<string[]>([]);

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
          <PollingStationNumber>{id}</PollingStationNumber>
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
            <ProgressList.Item key="recount" status="accept" active={targetForm === "recount"}>
              <Link to={`/input/${id}/recount`}>Is er herteld?</Link>
            </ProgressList.Item>
            <ProgressList.Item key="numbers" status="idle" active={targetForm === "numbers"}>
              <Link to={`/input/${id}/numbers`}>Aantal kiezers en stemmen</Link>
            </ProgressList.Item>
            <ProgressList.Item
              key="differences"
              status="idle"
              active={targetForm === "differences"}
            >
              <Link to={`/input/${id}/differences`}>Verschillen</Link>
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
                  <Link to={`/input/${id}/list/${listId}`} state={data}>
                    {list}
                  </Link>
                </ProgressList.Item>
              );
            })}
            <ProgressList.Ruler key="ruler2" />
            <ProgressList.Item key="save" status="idle" active={targetForm === "save"}>
              <Link to={`/input/${id}/save`}>Controleren en opslaan</Link>
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
