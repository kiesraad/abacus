import { Button, PollingStationNumber, Tag, WorkStationNumber } from "@kiesraad/ui";
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
        <nav>Hello nav</nav>
        <article>hello content</article>
      </main>
    </>
  );
}
