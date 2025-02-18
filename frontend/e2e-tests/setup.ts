import { chromium, type FullConfig } from "@playwright/test";

async function globalSetup(config: FullConfig) {
  const baseUrl = config.projects[0]?.use.baseURL;
  const browser = await chromium.launch();
  const page = await browser.newPage();

  await page.goto(`${baseUrl}/account/login`);
  await page.getByLabel("Gebruikersnaam").fill("admin");
  await page.getByLabel("Wachtwoord").fill("password");
  await page.getByRole("button", { name: "Inloggen" }).click();
  await page.locator("role=alert").waitFor();
  await page.context().storageState({ path: "e2e-tests/state/admin.json" });

  await page.goto(`${baseUrl}/account/login`);
  await page.getByLabel("Gebruikersnaam").fill("coordinator");
  await page.getByLabel("Wachtwoord").fill("password");
  await page.getByRole("button", { name: "Inloggen" }).click();
  await page.locator("role=alert").waitFor();
  await page.context().storageState({ path: "e2e-tests/state/coordinator.json" });

  await page.goto(`${baseUrl}/account/login`);
  await page.getByLabel("Gebruikersnaam").fill("typist");
  await page.getByLabel("Wachtwoord").fill("password");
  await page.getByRole("button", { name: "Inloggen" }).click();
  await page.locator("role=alert").waitFor();
  await page.context().storageState({ path: "e2e-tests/state/typist.json" });
}

export default globalSetup;
