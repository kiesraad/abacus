import { type Locator, type Page } from "@playwright/test";

import { InputBasePage } from "./InputBasePgObj";

export class SaveFormPage extends InputBasePage {
  readonly heading: Locator;
  readonly summaryText: Locator;
  readonly summaryList: Locator;
  readonly save: Locator;

  constructor(page: Page) {
    super(page);

    this.heading = page.getByRole("heading", { level: 2, name: "Controleren en opslaan" });
    this.summaryText = page.getByTestId("save-form-summary-text");
    this.summaryList = page.getByTestId("save-form-summary-list");
    this.save = page.getByRole("button", { name: "Opslaan" });
  }

  summaryListItem(text: string) {
    const li = this.summaryList.locator("li", { hasText: text });
    return li;
  }
}
