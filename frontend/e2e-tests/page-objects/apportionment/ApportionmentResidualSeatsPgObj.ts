import type { Locator, Page } from "@playwright/test";

export class ApportionmentResidualSeats {
  readonly header: Locator;

  readonly drawingLotsForListNeeded: Locator;
  readonly drawingLotsForListNeededAlert: Locator;
  readonly toDrawingLots: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Verdeling van de restzetels" });

    this.drawingLotsForListNeeded = page.getByRole("strong").filter({
      hasText: /Er is nog \d restzetel te verdelen/,
    });
    this.drawingLotsForListNeededAlert = page.getByRole("alert").filter({ has: this.drawingLotsForListNeeded });
    this.toDrawingLots = page.getByRole("link", { name: "Ga naar loting" });
  }
}
