require("dotenv").config({ quiet: true });

const { users: sampleUsers } = require("../data");
const { closeDatabase, connectDatabase } = require("./connection");
const { ensureDatabaseIndexes } = require("./indexes");

function createUserSeedDocument(user) {
  const { id, ...userData } = user;
  const seedDate = new Date("2026-08-01T00:00:00.000Z");

  return {
    _id: id,
    ...userData,
    createdAt: seedDate,
    updatedAt: seedDate,
  };
}

async function seedUsers(database) {
  const users = database.collection("users");
  const operations = sampleUsers.map((user) => ({
    updateOne: {
      filter: { _id: user.id },
      update: { $setOnInsert: createUserSeedDocument(user) },
      upsert: true,
    },
  }));

  const result = await users.bulkWrite(operations, { ordered: true });
  console.log(`Users ready: ${result.upsertedCount} inserted, ${result.matchedCount} already existed.`);
}

async function seedDatabase() {
  const database = await connectDatabase();
  await ensureDatabaseIndexes(database);
  await seedUsers(database);
}

seedDatabase()
  .catch((error) => {
    console.error(`Database seed failed: ${error.message}`);
    process.exitCode = 1;
  })
  .finally(closeDatabase);
