import { APIRequestContext, type FullConfig, request } from "@playwright/test";

export async function loginAs(request: APIRequestContext, username: string) {
  await request.post("/api/user/login", {
    data: {
      username,
      password: "password",
    },
  });
}

async function globalSetup(config: FullConfig) {
  const baseUrl = config.projects[0]?.use.baseURL;
  const session = await request.newContext({ baseURL: baseUrl });

  await loginAs(session, "admin");
  await session.storageState({ path: "e2e-tests/state/admin.json" });

  await loginAs(session, "coordinator");
  await session.storageState({ path: "e2e-tests/state/coordinator.json" });

  await loginAs(session, "typist");
  await session.storageState({ path: "e2e-tests/state/typist.json" });
}

export default globalSetup;
