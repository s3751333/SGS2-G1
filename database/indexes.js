async function ensureDatabaseIndexes(database) {
  const users = database.collection("users");
  const sessions = database.collection("sessions");
  const passwordResetTokens = database.collection("passwordResetTokens");

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
  await sessions.createIndex({ userId: 1 }, { name: "session_user" });
  await sessions.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "expire_sessions" },
  );
  await passwordResetTokens.createIndex({ userId: 1 }, { name: "reset_user" });
  await passwordResetTokens.createIndex(
    { expiresAt: 1 },
    { expireAfterSeconds: 0, name: "expire_password_resets" },
  );
}

module.exports = { ensureDatabaseIndexes };
