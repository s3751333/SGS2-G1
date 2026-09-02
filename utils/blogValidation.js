const blogCategories = ["programming", "mobile", "cloud", "cybersecurity"];
const blogImages = [
  "img/book.jpg",
  "img/mobileapp.jpg",
  "img/opensource.jpg",
  "img/cloudcomputing.jpg",
  "img/security.jpg",
];

function getBlogFormData(body) {
  return {
    title: String(body.title || "").trim(),
    category: String(body.category || "").trim(),
    tags: String(body.tags || "").trim(),
    summary: String(body.summary || "").trim(),
    image: String(body.image || "").trim(),
    content: String(body.content || "").trim(),
  };
}

function validateBlogForm(formData) {
  const errors = {};
  const tags = formData.tags
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  if (formData.title.length < 5 || formData.title.length > 100) {
    errors.title = "The title must contain between 5 and 100 characters.";
  }

  if (!blogCategories.includes(formData.category)) {
    errors.category = "Please select a valid category.";
  }

  if (tags.length === 0 || tags.length > 5 || tags.some((tag) => tag.length > 25)) {
    errors.tags = "Enter between 1 and 5 tags, with no more than 25 characters each.";
  }

  if (formData.summary.length < 20 || formData.summary.length > 250) {
    errors.summary = "The summary must contain between 20 and 250 characters.";
  }

  if (!blogImages.includes(formData.image)) {
    errors.image = "Please select a valid cover image.";
  }

  if (formData.content.length < 50 || formData.content.length > 5000) {
    errors.content = "The article must contain between 50 and 5000 characters.";
  }

  return { errors, tags };
}

function splitContentIntoParagraphs(content) {
  return content
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

module.exports = {
  getBlogFormData,
  splitContentIntoParagraphs,
  validateBlogForm,
};
