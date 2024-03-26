import { Button, InputGrid, PollingStationNumber, ProgressList, Tag, WorkStationNumber } from "@kiesraad/ui";
import { useParams } from "react-router-dom";
import { IconCross } from "@kiesraad/icon";

export function PollingStationPage() {
  const { id } = useParams();
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
            <ProgressList.Item status="accept">Is er herteld?</ProgressList.Item>
            <ProgressList.Item status="reject" message="A message">
              Aantal kiezers en stemmen
            </ProgressList.Item>
            <ProgressList.Item status="idle" active>
              Verschillen?
            </ProgressList.Item>
            <ProgressList.Ruler />
            {lijsten.map((lijst, index) => (
              <ProgressList.Item key={`lijst${index}`} status="idle">
                {lijst}
              </ProgressList.Item>
            ))}
            <ProgressList.Ruler />
            <ProgressList.Item status="idle">Controleren en opslaan?</ProgressList.Item>
          </ProgressList>
        </nav>
        <article>
          <h3>Toegalaten kiezers en uitgebrachte stemmen</h3>

          <InputGrid>
            <InputGrid.Header>
              <th>Veld</th>
              <th>Geteld aantal</th>
              <th>Omschrijving</th>
            </InputGrid.Header>
            <InputGrid.Body>
              {new Array(4).fill("").map((_, index) => (
                <InputGrid.Row key={index}>
                  <td>A</td>
                  <td>
                    <input id={`input-1-${index}`} />
                  </td>
                  <td>Stempassen</td>
                </InputGrid.Row>
              ))}
              <InputGrid.Seperator />
              {new Array(4).fill("").map((_, index) => (
                <InputGrid.Row key={index}>
                  <td>A</td>
                  <td>
                    <input id={`input-2-${index}`} />
                  </td>
                  <td>Stempassen</td>
                </InputGrid.Row>
              ))}
            </InputGrid.Body>
          </InputGrid>
        </article>
      </main>
      <aside>Volgende</aside>
    </>
  );
}

const lijsten: string[] = [
  "Lijst 1 - Vurige Vleugels Partij",
  "Lijst 2 - Wijzen van Water en Wind",
  "Lijst 3 - Eeuwenoude Aarde Unie"
];
