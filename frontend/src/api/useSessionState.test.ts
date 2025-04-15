import { beforeEach, describe, expect, test } from "vitest";

import { WhoAmIRequestHandler } from "@/testing/api-mocks/RequestHandlers";
import { overrideOnce, server } from "@/testing/server";
import { renderHook, waitFor } from "@/testing/test-utils";

import { ApiClient } from "./ApiClient";
import useSessionState from "./useSessionState";

describe("Test useSessionState", () => {
  beforeEach(() => {
    server.use(WhoAmIRequestHandler);
  });

  test("Initial user request should occur", async () => {
    const client = new ApiClient();
    const { result } = renderHook(() => useSessionState(client));

    expect(result.current.user).toBeNull();

    await waitFor(() => {
      expect(result.current.user?.role).toBe("administrator");
    });
  });

  test("We should be able to logout", async () => {
    overrideOnce("post", "/api/user/logout", 200, {});

    const client = new ApiClient();
    const { result } = renderHook(() => useSessionState(client));

    await waitFor(() => {
      expect(result.current.user?.role).toBe("administrator");
    });

    await result.current.logout();

    await waitFor(() => {
      expect(result.current.user).toBeNull();
    });
  });

  test("We should be able to extend a session", async () => {
    const client = new ApiClient();
    const { result } = renderHook(() => useSessionState(client));

    await waitFor(() => {
      expect(result.current.user?.role).toBe("administrator");
    });

    overrideOnce("get", "/api/user/whoami", 200, {
      user_id: 2,
      username: "typist",
      role: "typist",
      fullname: "Typist",
      needs_password_change: false,
    });

    await result.current.extendSession();

    await waitFor(() => {
      expect(result.current.user?.role).toBe("typist");
    });
  });

  test("Keep track of expiration", async () => {
    const client = new ApiClient();
    let expiration: Date | null = null;

    client.subscribeToSessionExpiration((e) => {
      expiration = e;
    });

    const { result } = renderHook(() => useSessionState(client, false));

    await result.current.extendSession();

    await waitFor(() => {
      expect(expiration).not.toBeNull();
    });
  });
});
