import type { Locator, Page } from "@playwright/test";

export class ApportionmentResidualSeats {
  readonly header: Locator;

  private readonly drawingLotsForListNeeded: Locator;
  readonly drawingLotsForListNeededAlert: Locator;
  private readonly drawingLotsForP9Needed: Locator;
  readonly drawingLotsForP9NeededAlert: Locator;
  readonly toDrawingLots: Locator;

  constructor(protected readonly page: Page) {
    this.header = page.getByRole("heading", { level: 1, name: "Verdeling van de restzetels" });

    this.drawingLotsForListNeeded = page.getByRole("strong").filter({
      hasText: "Er is nog 1 restzetel te verdelen.",
    });
    this.drawingLotsForListNeededAlert = page.getByRole("alert").filter({ has: this.drawingLotsForListNeeded });
    this.drawingLotsForP9Needed = page.getByRole("strong").filter({
      hasText: "Er moet 1 restzetel worden afgestaan.",
    });
    this.drawingLotsForP9NeededAlert = page.getByRole("alert").filter({ has: this.drawingLotsForP9Needed });
    this.toDrawingLots = page.getByRole("link", { name: "Ga naar loting" });
  }
}
