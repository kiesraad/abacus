import type { Story } from "@ladle/react";

import { Button } from "@kiesraad/ui";

import { Modal } from "./Modal";

export const DefaultModal: Story = () => (
  <>
    <Modal onClose={() => {}}>
      <h2>Wat wil je doen met je invoer?</h2>
      <p>
        Ga je op een later moment verder met het invoeren van dit stembureau? Dan kan je de invoer die je al hebt gedaan
        bewaren.
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
  </>
);
