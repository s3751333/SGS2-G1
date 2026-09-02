function toApplicationUser(document) {
  if (!document) return null;

  const { _id, ...user } = document;
  return { id: _id, ...user };
}

async function getNextUserId(database) {
  const counter = await database.collection("counters").findOneAndUpdate(
    { _id: "users" },
    { $inc: { value: 1 } },
    { returnDocument: "after", upsert: true },
  );

  return counter.value;
}

async function createUser(database, userData) {
  const id = await getNextUserId(database);
  const now = new Date();
  const document = {
    _id: id,
    ...userData,
    createdAt: now,
    updatedAt: now,
  };

  await database.collection("users").insertOne(document);
  return toApplicationUser(document);
}

async function findUserByEmail(database, email) {
  const document = await database.collection("users").findOne(
    { email },
    { collation: { locale: "en", strength: 2 } },
  );
  return toApplicationUser(document);
}

async function findUserById(database, userId) {
  const document = await database.collection("users").findOne({ _id: Number(userId) });
  return toApplicationUser(document);
}

async function findUserByUsernameOrEmail(database, username, email) {
  const document = await database.collection("users").findOne(
    { $or: [{ username }, { email }] },
    { collation: { locale: "en", strength: 2 } },
  );
  return toApplicationUser(document);
}

async function listUsers(database) {
  const documents = await database.collection("users").find().sort({ _id: 1 }).toArray();
  return documents.map(toApplicationUser);
}

async function updateUser(database, userId, changes) {
  const result = await database.collection("users").findOneAndUpdate(
    { _id: Number(userId) },
    { $set: { ...changes, updatedAt: new Date() } },
    { returnDocument: "after" },
  );
  return toApplicationUser(result);
}

module.exports = {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsernameOrEmail,
  listUsers,
  toApplicationUser,
  updateUser,
};
