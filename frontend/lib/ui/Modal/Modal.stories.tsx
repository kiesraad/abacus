import type { Story } from "@ladle/react";

import { Button } from "@kiesraad/ui";
import { Modal } from "./Modal";

export const DefaultModal: Story = () => (
  <>
    <Modal onClose={() => {}}>
      <h2>Invoer bewaren?</h2>
      <p>Wil je de invoer bewaren zodat je later verder kan? Overleg met de verkiezingsleider.</p>
      <nav>
        <Button size="lg">Bewaar invoer</Button>
        <Button size="lg" variant="secondary">
          Verwijder invoer
        </Button>
      </nav>
    </Modal>
  </>
);
