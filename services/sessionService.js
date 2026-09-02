const { createRandomToken, hashToken } = require("../utils/security");
const { findUserById } = require("../repositories/userRepository");

const COOKIE_NAME = "sessionId";
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getSessionToken(request) {
  const cookieHeader = request.headers.cookie || "";
  const sessionCookie = cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith(`${COOKIE_NAME}=`));

  return sessionCookie ? decodeURIComponent(sessionCookie.slice(COOKIE_NAME.length + 1)) : "";
}

function getCookieOptions() {
  return {
    httpOnly: true,
    maxAge: SESSION_DURATION_MS,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  };
}

async function createSession(database, userId) {
  const token = createRandomToken();
  const now = new Date();

  await database.collection("sessions").insertOne({
    _id: hashToken(token),
    userId: Number(userId),
    createdAt: now,
    expiresAt: new Date(now.getTime() + SESSION_DURATION_MS),
  });

  return token;
}

async function deleteSession(database, token) {
  if (!token) return;
  await database.collection("sessions").deleteOne({ _id: hashToken(token) });
}

async function deleteUserSessions(database, userId) {
  await database.collection("sessions").deleteMany({ userId: Number(userId) });
}

async function findSessionUser(database, token) {
  if (!token) return null;

  const session = await database.collection("sessions").findOne({
    _id: hashToken(token),
    expiresAt: { $gt: new Date() },
  });

  if (!session) return null;

  const user = await findUserById(database, session.userId);

  if (!user || user.status !== "active") {
    await deleteSession(database, token);
    return null;
  }

  const { passwordHash, securityAnswerHashes, ...safeUser } = user;
  return safeUser;
}

function setSessionCookie(response, token) {
  response.cookie(COOKIE_NAME, token, getCookieOptions());
}

function clearSessionCookie(response) {
  const { maxAge, ...options } = getCookieOptions();
  response.clearCookie(COOKIE_NAME, options);
}

module.exports = {
  clearSessionCookie,
  createSession,
  deleteSession,
  deleteUserSessions,
  findSessionUser,
  getSessionToken,
  setSessionCookie,
};
