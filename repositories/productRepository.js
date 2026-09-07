function toProduct(document) {
  if (!document) return null;
  const { _id, ...product } = document;
  return { id: _id, ...product };
}

async function listProducts(database, filter = {}, options = {}) {
  const documents = await database.collection("products").find(filter, options).sort({ displayOrder: 1, _id: 1 }).toArray();
  return documents.map(toProduct);
}

async function findProductById(database, productId, options = {}) {
  return toProduct(await database.collection("products").findOne({ _id: productId }, options));
}

module.exports = { listProducts, findProductById };
