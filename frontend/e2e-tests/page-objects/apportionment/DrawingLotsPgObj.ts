import type { Locator, Page } from "@playwright/test";

export class DrawingLots {
  readonly title: Locator;
  readonly list: Locator;
  readonly instructions: Locator;
  readonly result: Locator;
  readonly next: Locator;

  constructor(protected readonly page: Page) {
    this.title = page.getByRole("heading", { level: 2, name: "Loting noodzakelijk" });
    this.list = page.getByRole("list", { name: "drawing-lots-information" });
    this.instructions = page.getByRole("heading", { level: 3, name: "Instructies voor loting" });
    this.result = page.getByRole("heading", { level: 3, name: "Resultaat loting" });
    this.next = page.getByRole("button", { name: "Volgende" });
  }

  getHeaderByName(name: string) {
    return this.page.getByRole("heading", { level: 1, name: name });
  }

  getListItemByText(text: string) {
    return this.list.getByRole("listitem").filter({ hasText: text });
  }

  getOptionByName(name: string) {
    return this.page.getByRole("radio", { name: name });
  }
}
