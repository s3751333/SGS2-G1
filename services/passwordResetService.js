const { createRandomToken, hashToken } = require("../utils/security");

const RESET_DURATION_MS = 15 * 60 * 1000;

async function createPasswordReset(database, userId) {
  const token = createRandomToken();
  const now = new Date();

  await database.collection("passwordResetTokens").deleteMany({ userId: Number(userId) });
  await database.collection("passwordResetTokens").insertOne({
    _id: hashToken(token),
    userId: Number(userId),
    createdAt: now,
    expiresAt: new Date(now.getTime() + RESET_DURATION_MS),
  });

  return token;
}

async function deletePasswordReset(database, token) {
  if (!token) return;
  await database.collection("passwordResetTokens").deleteOne({ _id: hashToken(token) });
}

async function findPasswordReset(database, token) {
  if (!token) return null;

  return database.collection("passwordResetTokens").findOne({
    _id: hashToken(token),
    expiresAt: { $gt: new Date() },
  });
}

module.exports = {
  createPasswordReset,
  deletePasswordReset,
  findPasswordReset,
};
