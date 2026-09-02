require("dotenv").config({ quiet: true });

const { createApp } = require("./app");
const { closeDatabase, connectDatabase } = require("./database/connection");
const { ensureDatabaseIndexes } = require("./database/indexes");

const PORT = Number(process.env.PORT) || 3000;
let server;

async function startServer() {
  const database = await connectDatabase();
  await ensureDatabaseIndexes(database);
  const app = createApp(database);

  server = app.listen(PORT, () => {
    console.log(`BookNook is running at http://localhost:${PORT}`);
  });
}

async function stopServer(signal) {
  console.log(`\n${signal} received. Closing BookNook...`);

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  await closeDatabase();
  process.exit(0);
}

process.once("SIGINT", () => stopServer("SIGINT"));
process.once("SIGTERM", () => stopServer("SIGTERM"));

startServer().catch((error) => {
  console.error(`BookNook could not start: ${error.message}`);
  process.exit(1);
});
