const { products } = require("../data");

async function seedProducts(database) {
  const now = new Date();
  return database.collection("products").bulkWrite(products.map(({ id, ...product }, displayOrder) => ({
    updateOne: {
      filter: { _id: id },
      update: { $setOnInsert: { _id: id, ...product, displayOrder, featured: ["little-prince", "catan", "english-grammar"].includes(id), createdAt: now, updatedAt: now } },
      upsert: true,
    },
  })));
}

module.exports = { seedProducts };
