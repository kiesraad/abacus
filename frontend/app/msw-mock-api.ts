const sleep = async (ms: number) => new Promise((res) => setTimeout(res, ms));
const randInt = (min: number, max: number) => min + Math.floor(Math.random() * (max - min));

export async function startMockAPI() {
  // dynamic imports to make extremely sure none of this code ends up in the prod bundle
  const { handlers } = await import("@kiesraad/api-mocks");
  const { http } = await import("msw");
  const { setupWorker } = await import("msw/browser");

  // defined in here because it depends on the dynamic import
  const interceptAll = http.all("/v1/*", async () => {
    // random delay on all requests to simulate a real API
    await sleep(randInt(200, 400));
    // don't return anything means fall through to the real handlers
  });

  // https://mswjs.io/docs/api/setup-worker/start#options
  await setupWorker(interceptAll, ...handlers).start({
    quiet: true, // don't log successfully handled requests
    // custom handler only to make logging less noisy. unhandled requests still
    // pass through to the server
    onUnhandledRequest(req) {
      const path = new URL(req.url).pathname;
      // Files that get pulled in dynamic imports. It is expected that MSW will
      // not handle them and they fall through to the dev server, so warning
      // about them is just noise.
      const ignore = [
        path.startsWith("/app"),
        path.startsWith("/lib"),
        path.startsWith("/node_modules"),
        path.startsWith("/js"),
        path.startsWith("/font"),
      ].some(Boolean);
      if (!ignore) {
        // message format copied from MSW source
        console.warn(`[MSW] Warning: captured an API request without a matching request handler:

  • ${req.method} ${path}

If you want to intercept this unhandled request, create a request handler for it.`);
      }
    },
  });
}
