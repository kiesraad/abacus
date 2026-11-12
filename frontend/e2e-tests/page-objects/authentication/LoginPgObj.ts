import { expect, type Locator, type Page } from "@playwright/test";

export class LoginPgObj {
  readonly heading: Locator;
  readonly username: Locator;
  readonly password: Locator;
  readonly loginBtn: Locator;
  readonly alert: Locator;

  constructor(protected readonly page: Page) {
    this.heading = page.getByRole("heading", { level: 1, name: "Inloggen" });
    this.username = page.getByRole("textbox", { name: "Gebruikersnaam" });
    this.password = page.getByRole("textbox", { name: "Wachtwoord" });
    this.loginBtn = page.getByRole("button", { name: "Inloggen" });
    this.alert = page.getByRole("alert");
  }

  async login(username: string, password: string) {
    await this.username.fill(username);
    await this.password.fill(password);
    // Parallel tests log in from the same IP; retry until another test's successful login releases the rate limit
    await expect(async () => {
      const responsePromise = this.page.waitForResponse(
        (response) => new URL(response.url()).pathname === "/api/login" && response.request().method() === "POST",
      );
      await this.loginBtn.click();
      expect((await responsePromise).status()).not.toBe(429);
    }).toPass({ intervals: [250], timeout: 60_000 });
  }
}
