const http = require("http");

const PORT = 8080;

const options = {
  host: "localhost",
  port: PORT,
  timeout: 2000,
};

const req = http.request(options, (res) => {
  console.log(`✅ Backend is running on port ${PORT}`);
});

req.on("error", () => {
  console.log(`❌ Backend is NOT running on port ${PORT}`);
});

req.end();
