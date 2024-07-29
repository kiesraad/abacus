import { useState } from "react";
import { Outlet } from "react-router-dom";

import { PollingStationProgress } from "app/component/pollingstation/PollingStationProgress";

import { usePollingStation } from "@kiesraad/api";
import { IconCross } from "@kiesraad/icon";
import { Badge, Button, Modal, PollingStationNumber, WorkStationNumber } from "@kiesraad/ui";

export function DataEntryLayout() {
  const { pollingStation } = usePollingStation();
  const [openModal, setOpenModal] = useState(false);

  function changeDialog() {
    setOpenModal(!openModal);
  }

  return (
    <>
      <header>
        <section>
          <PollingStationNumber>{pollingStation.number}</PollingStationNumber>
          <h1>{pollingStation.name}</h1>
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
          <PollingStationProgress />
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
