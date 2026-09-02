const crypto = require("node:crypto");

function hashSecret(secret) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(secret, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function checkSecret(secret, storedHash) {
  if (typeof storedHash !== "string") return false;

  const [salt, savedHash] = storedHash.split(":");

  if (!salt || !savedHash) return false;

  try {
    const savedHashBuffer = Buffer.from(savedHash, "hex");
    const enteredHashBuffer = crypto.scryptSync(secret, salt, 64);

    return savedHashBuffer.length === enteredHashBuffer.length
      && crypto.timingSafeEqual(savedHashBuffer, enteredHashBuffer);
  } catch {
    return false;
  }
}

function createRandomToken() {
  return crypto.randomBytes(24).toString("hex");
}

function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function normalizeSecurityAnswer(answer) {
  return String(answer || "")
    .normalize("NFKC")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

module.exports = {
  checkSecret,
  createRandomToken,
  hashSecret,
  hashToken,
  normalizeSecurityAnswer,
};
