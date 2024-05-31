import type { Story } from "@ladle/react";

import { Modal } from "./Modal";
import { Button } from "@kiesraad/ui";

export const DefaultModal: Story = () => (
  <>
    <Modal isOpen={true} onClose={() => {}}>
      <h2>Invoer bewaren?</h2>
      <p>Wil je de invoer bewaren zodat je later verder kan? Overleg met de verkiezingsleider.</p>
      <nav>
        <Button>Bewaar invoer</Button>
        <Button variant="secondary">Verwijder invoer</Button>
      </nav>
    </Modal>
  </>
);
