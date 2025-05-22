import { type FullConfig, request } from "@playwright/test";

import { loginAs } from "./helpers-utils/e2e-test-api-helpers";

async function globalSetup(config: FullConfig) {
  const baseUrl = config.projects[0]?.use.baseURL;
  const session = await request.newContext({ baseURL: baseUrl });

  await loginAs(session, "admin1");
  await session.storageState({ path: "e2e-tests/state/admin.json" });

  await loginAs(session, "coordinator1");
  await session.storageState({ path: "e2e-tests/state/coordinator.json" });

  await loginAs(session, "typist1");
  await session.storageState({ path: "e2e-tests/state/typist.json" });

  await loginAs(session, "typist2");
  await session.storageState({ path: "e2e-tests/state/typist2.json" });
}

export default globalSetup;
