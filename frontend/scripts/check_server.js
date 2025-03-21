const PORT = 8080;

fetch(`http://localhost:${PORT}`, { signal: AbortSignal.timeout(2000) })
  .then(() => {
    console.log(`✅ Backend is running on port ${PORT}`);
    process.exit(0);
  })
  .catch((err) => {
    console.log(`❌ Backend is NOT running on port ${PORT} (${err.message})`);
    process.exit(1);
  });
