import { useState } from "react";
import { Link, useParams } from "react-router-dom";

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
import { CandidatesVotesForm } from "app/component/form/candidates_votes_form/CandidatesVotesForm.tsx";

export function PollingStationPage() {
  const { id, section } = useParams();
  // TODO: Set default targetForm correctly once all pages are implemented
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
              <Link to={`/input/${id}/recount`}>Is er herteld?</Link>
            </ProgressList.Item>
            <ProgressList.Item status="idle" active={targetForm === "numbers"}>
              <Link to={`/input/${id}/numbers`}>Aantal kiezers en stemmen</Link>
            </ProgressList.Item>
            <ProgressList.Item status="idle" active={targetForm === "differences"}>
              <Link to={`/input/${id}/differences`}>Verschillen</Link>
            </ProgressList.Item>
            <ProgressList.Ruler />
            {lists.map((list, index) => {
              const listId = `list${(index + 1).toString()}`;
              return (
                <ProgressList.Item key={listId} status="idle" active={targetForm === listId}>
                  <Link to={`/input/${id}/${listId}`}>{list}</Link>
                </ProgressList.Item>
              );
            })}
            <ProgressList.Ruler />
            <ProgressList.Item status="idle" active={targetForm === "save"}>
              <Link to={`/input/${id}/save`}>Controleren en opslaan</Link>
            </ProgressList.Item>
          </ProgressList>
        </nav>
        <article>
          {targetForm === "recount" && <div>Placeholder Recount Page</div>}
          {targetForm === "numbers" && <VotersAndVotesForm />}
          {targetForm === "differences" && <div>Placeholder Differences Page</div>}
          {targetForm.startsWith("list") && <CandidatesVotesForm />}
          {targetForm === "save" && <div>Placeholder Check and Save Page</div>}
        </article>
      </main>
      <aside>&nbsp;</aside>
      {openModal && (
        <Modal onClose={changeDialog}>
          <h2>Invoer bewaren?</h2>
          <p>
            Wil je de invoer bewaren zodat je later verder kan? Overleg met de verkiezingsleider.
          </p>
          <nav>
            <Button>Bewaar invoer</Button>
            <Button variant="secondary">Verwijder invoer</Button>
          </nav>
        </Modal>
      )}
    </>
  );
}

const lists: string[] = [
  "Lijst 1 - Vurige Vleugels Partij",
  "Lijst 2 - Wijzen van Water en Wind",
  "Lijst 3 - Eeuwenoude Aarde Unie",
];
