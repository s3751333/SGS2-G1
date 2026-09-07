function toForumRecord(document) {
  if (!document) return null;
  const { _id, ...record } = document;
  return { id: _id, ...record };
}

async function findForumRecord(database, collection, id) {
  if (!/^[1-9]\d*$/.test(String(id)) || !Number.isSafeInteger(Number(id))) return null;
  return toForumRecord(await database.collection(collection).findOne({ _id: Number(id), deleted: false }));
}

async function listForumTopics(database) {
  const topics = await database.collection("forumTopics").find({ deleted: false }).sort({ createdAt: -1, _id: -1 }).toArray();
  return topics.map(toForumRecord);
}

async function listForumReplies(database, topicId) {
  const replies = await database.collection("forumReplies").find({ topicId, deleted: false }).sort({ createdAt: 1, _id: 1 }).toArray();
  return replies.map(toForumRecord);
}

async function createForumRecord(database, collection, fields) {
  const counter = await database.collection("counters").findOneAndUpdate(
    { _id: collection }, { $inc: { value: 1 } }, { upsert: true, returnDocument: "after" },
  );
  const now = new Date();
  const document = { _id: counter.value, ...fields, createdAt: now, updatedAt: now, deleted: false };
  await database.collection(collection).insertOne(document);
  return toForumRecord(document);
}

async function updateForumRecord(database, collection, record, authorId, changes) {
  return database.collection(collection).updateOne(
    { _id: record.id, authorId, deleted: false },
    { $set: { ...changes, updatedAt: new Date() } },
  );
}

async function getForumAuthors(database, records) {
  const ids = [...new Set(records.map((record) => record.authorId))];
  const users = await database.collection("users").find(
    { _id: { $in: ids } }, { projection: { fullName: 1 } },
  ).toArray();
  return new Map(users.map((user) => [user._id, user.fullName]));
}

module.exports = { findForumRecord, listForumTopics, listForumReplies, createForumRecord, updateForumRecord, getForumAuthors };
