import type { Story } from "@ladle/react";

import { Button } from "@kiesraad/ui";

import { Modal } from "./Modal";

export const DefaultModal: Story = () => (
  <Modal id="modal-title" onClose={() => {}}>
    <h2 id="modal-title" tabIndex={-1}>
      Wat wil je doen met je invoer?
    </h2>
    <p>
      Ga je op een later moment verder met het invoeren van dit stembureau? Dan kan je de invoer die je al hebt gedaan
      bewaren.
    </p>
    <p>Twijfel je? Overleg dan met de coördinator.</p>
    <nav>
      <Button size="lg">Invoer bewaren</Button>
      <Button size="lg" variant="secondary">
        Niet bewaren
      </Button>
    </nav>
  </Modal>
);
