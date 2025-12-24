const PORT = 8080;
const TRIES = 30;

// check every second whether the backend is running
// try TRIES times and use the exit code to indicate the status
// 0 if it is running, 1 if it is not
async function waitForPort(port = PORT, tries = TRIES) {
  process.stdout.write(`Waiting for backend to start on port ${port}`);

  for (let i = 0; i < tries; i++) {
    try {
      await fetch(`http://localhost:${port}/api/initialised`, {
        signal: AbortSignal.timeout(1000),
      });

      console.log(`\n✅ Backend is running on port ${port}`);
      process.exit(0);

      /* eslint-disable-next-line no-unused-vars */
    } catch (_err) {
      // try again in 1 second
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    process.stdout.write(".");
  }

  console.log(`\n❌ Backend is NOT running on port ${port}`);
  process.exit(1);
}

(async () => {
  await waitForPort();
})();
