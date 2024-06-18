import { useState } from "react";
import { useParams } from "react-router-dom";

import { IconCross } from "@kiesraad/icon";
import {
  Badge,
  Button,
  Modal,
  PollingStationNumber,
  ProgressList,
  WorkStationNumber,
} from "@kiesraad/ui";
import { VotersAndVotesForm } from "app/component/form/voters_and_votes/VotersAndVotesForm";

export function PollingStationPage() {
  const { id, section } = useParams();
  const targetForm = section || "numbers";
  const [openModal, setOpenModal] = useState(false);

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
            <ProgressList.Item status="accept" active={targetForm === "recount"}>
              Is er herteld?
            </ProgressList.Item>
            <ProgressList.Item status="idle" message="A message" active={targetForm === "numbers"}>
              Aantal kiezers en stemmen
            </ProgressList.Item>
            <ProgressList.Item status="idle" active={targetForm === "differences"}>
              Verschillen?
            </ProgressList.Item>
            <ProgressList.Ruler />
            {lijsten.map((lijst, index) => (
              <ProgressList.Item key={`lijst${index.toString()}`} status="idle">
                {lijst}
              </ProgressList.Item>
            ))}
            <ProgressList.Ruler />
            <ProgressList.Item status="idle">Controleren en opslaan?</ProgressList.Item>
          </ProgressList>
        </nav>
        <article>
          <VotersAndVotesForm />
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

const lijsten: string[] = [
  "Lijst 1 - Vurige Vleugels Partij",
  "Lijst 2 - Wijzen van Water en Wind",
  "Lijst 3 - Eeuwenoude Aarde Unie",
];
