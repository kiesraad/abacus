import {
  Button,
  PollingStationNumber,
  ProgressList,
  Tag,
  WorkStationNumber,
} from "@kiesraad/ui";
import { useParams } from "react-router-dom";
import { IconCross } from "@kiesraad/icon";
import { VotersAndVotesForm } from "app/component/form/voters_and_votes/VotersAndVotesForm";

export function PollingStationPage() {
  const { id, section } = useParams();

  const targetForm = section || "numbers";

  return (
    <>
      <header>
        <section>
          <PollingStationNumber>{id}</PollingStationNumber>
          <h1>Fluisterbosdreef 8</h1>
          <Tag>1e invoer</Tag>
        </section>
        <section>
          <Button variant="secondary" size="sm" rightIcon={<IconCross />}>
            Invoer afbreken
          </Button>{" "}
          &nbsp; &nbsp; &nbsp;
          <WorkStationNumber>16</WorkStationNumber>
        </section>
      </header>
      <main>
        <nav>
          <ProgressList>
            <ProgressList.Item
              status="accept"
              active={targetForm === "recount"}
            >
              Is er herteld?
            </ProgressList.Item>
            <ProgressList.Item
              status="idle"
              message="A message"
              active={targetForm === "numbers"}
            >
              Aantal kiezers en stemmen
            </ProgressList.Item>
            <ProgressList.Item
              status="idle"
              active={targetForm === "differences"}
            >
              Verschillen?
            </ProgressList.Item>
            <ProgressList.Ruler />
            {lijsten.map((lijst, index) => (
              <ProgressList.Item key={`lijst${index.toString()}`} status="idle">
                {lijst}
              </ProgressList.Item>
            ))}
            <ProgressList.Ruler />
            <ProgressList.Item status="idle">
              Controleren en opslaan?
            </ProgressList.Item>
          </ProgressList>
        </nav>
        <article>
          <VotersAndVotesForm />
        </article>
      </main>
      <aside>&nbsp;</aside>
    </>
  );
}

const lijsten: string[] = [
  "Lijst 1 - Vurige Vleugels Partij",
  "Lijst 2 - Wijzen van Water en Wind",
  "Lijst 3 - Eeuwenoude Aarde Unie",
];
