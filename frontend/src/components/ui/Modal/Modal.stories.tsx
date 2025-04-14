import { useState } from "react";

import type { Story } from "@ladle/react";

import { Button } from "../Button/Button";
import { Modal } from "./Modal";

export const DefaultModal: Story = () => {
  const [modalOpen, setModalOpen] = useState(true);
  function handleClose() {
    setModalOpen(false);
  }

  return (
    <>
      <Button
        size="lg"
        onClick={() => {
          setModalOpen(true);
        }}
      >
        Open modal
      </Button>

      {modalOpen && (
        <Modal title="Wat wil je doen met je invoer?" onClose={handleClose}>
          <p>
            Ga je op een later moment verder met het invoeren van dit stembureau? Dan kan je de invoer die je al hebt
            gedaan bewaren.
          </p>
          <p>Twijfel je? Overleg dan met de coördinator.</p>
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
};
