async function ensureDatabaseIndexes(database) {
  const users = database.collection("users");

  await users.createIndex(
    { username: 1 },
    {
      collation: { locale: "en", strength: 2 },
      name: "unique_username",
      unique: true,
    },
  );

  await users.createIndex(
    { email: 1 },
    {
      collation: { locale: "en", strength: 2 },
      name: "unique_email",
      unique: true,
    },
  );

  await users.createIndex({ role: 1, status: 1 }, { name: "role_and_status" });
}

module.exports = { ensureDatabaseIndexes };
