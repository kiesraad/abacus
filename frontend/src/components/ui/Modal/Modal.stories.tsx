import { useState } from "react";

import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";

import { Button } from "../Button/Button";
import { Modal } from "./Modal";

export const DefaultModal: StoryObj = {
  render: () => {
    const [modalOpen, setModalOpen] = useState(true);
    function handleClose() {
      setModalOpen(false);
    }

    return (
      <>
        <Button
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
              <Button size="xl">Invoer bewaren</Button>
              <Button size="lg" variant="tertiary-destructive">
                Verwijder invoer
              </Button>
            </nav>
          </Modal>
        )}
      </>
    );
  },
  play: async ({ canvas, userEvent, step }) => {
    await step("Close modal using X button", async () => {
      // Test modal is initially visible and heading is focused
      const modal = canvas.getByRole("dialog");
      await expect(modal).toBeVisible();
      const heading = within(modal).getByRole("heading", { level: 3 });
      await expect(heading).toHaveFocus();

      // Test closing modal with X button
      const closeButton = within(modal).getByRole("button", { name: "Annuleren" });
      await userEvent.click(closeButton);
    });

    await step("Reopen model and close using Escape key", async () => {
      // Test reopening modal
      const openButton = canvas.getByRole("button", { name: "Open modal" });
      await userEvent.click(openButton);

      // Check that modal is visible and heading is focused
      const reopenedModal = canvas.getByRole("dialog");
      await expect(reopenedModal).toBeVisible();
      const reopenedHeading = within(reopenedModal).getByRole("heading", { level: 3 });
      await expect(reopenedHeading).toHaveFocus();

      // Close modal with Escape key
      await userEvent.keyboard("{Escape}");
    });

    await step("Reopen model again", async () => {
      // Test reopening modal
      const openButton = canvas.getByRole("button", { name: "Open modal" });
      await userEvent.click(openButton);

      // Check that modal is visible and heading is focused
      const finalModal = canvas.getByRole("dialog");
      const finalHeading = within(finalModal).getByRole("heading", { level: 3 });
      await expect(finalHeading).toHaveFocus();
    });
  },
};

export default {} satisfies Meta;
