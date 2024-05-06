const sleep = async (ms: number) => new Promise((res) => setTimeout(res, ms));
const randInt = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min));

export async function startMockAPI() {
  const { handlers } = await import("@kiesraad/api-mocks");
  const { http } = await import("msw");
  const { setupWorker } = await import("msw/browser");

  const interceptAll = http.all("/v1/*", async () => {
    await sleep(randInt(200, 400));
  });

  // https://mswjs.io/docs/api/setup-worker/start#options
  await setupWorker(interceptAll, ...handlers).start({
    quiet: true,
    onUnhandledRequest(req) {
      const path = new URL(req.url).pathname;
      const ignore = [
        path.startsWith("/app"),
        path.startsWith("/lib"),
        path.startsWith("/node_modules"),
        path.startsWith("/js"),
        path.startsWith("/font"),
      ].some(Boolean);
      if (!ignore) {
        console.warn(`[MSW] Warning: captured an API request without a matching request handler:

  • ${req.method} ${path}

If you want to intercept this unhandled request, create a request handler for it.`);
      }
    },
  });
}
