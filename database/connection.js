const dns = require("node:dns");
const { MongoClient } = require("mongodb");

// Node's built-in DNS resolver sometimes fails to pick up a machine's
// configured DNS servers when looking up mongodb+srv:// records, even when
// the OS-level resolver (e.g. nslookup) works fine. Pointing Node directly
// at a public DNS server avoids that class of "querySrv ECONNREFUSED" error.
dns.setServers(["8.8.8.8", "8.8.4.4"]);

let client;
let database;

function getRequiredEnvironmentVariable(name) {
  const value = String(process.env[name] || "").trim();

  if (!value) {
    throw new Error(`${name} is missing. Add it to the local .env file.`);
  }

  return value;
}

async function connectDatabase() {
  if (database) return database;

  const uri = getRequiredEnvironmentVariable("MONGODB_URI");
  const databaseName = getRequiredEnvironmentVariable("MONGODB_DB_NAME");
  client = new MongoClient(uri);

  try {
    await client.connect();
    database = client.db(databaseName);
    await database.command({ ping: 1 });
    console.log(`Connected to MongoDB database: ${databaseName}`);
    return database;
  } catch (error) {
    await client.close().catch(() => {});
    client = undefined;
    database = undefined;
    throw error;
  }
}

function getDatabase() {
  if (!database) {
    throw new Error("The database is not connected. Call connectDatabase() first.");
  }

  return database;
}

async function closeDatabase() {
  if (client) await client.close();
  client = undefined;
  database = undefined;
}

module.exports = {
  closeDatabase,
  connectDatabase,
  getDatabase,
};