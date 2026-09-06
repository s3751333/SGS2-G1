const express = require("express");
const { requireLogin } = require("../middleware/auth");
const {
  getUploadedBlogImagePath,
  handleBlogImageUpload,
  removeUploadedBlogImage,
} = require("../middleware/blogImageUpload");
const {
  createBlogComment,
  createBlogPost,
  deleteBlogPost,
  findBlogPostById,
  listBlogPosts,
  updateBlogPost,
} = require("../repositories/blogRepository");
const {
  getBlogFormData,
  splitContentIntoParagraphs,
  validateBlogForm,
} = require("../utils/blogValidation");

function getPostId(articleName) {
  const match = /^blog(\d+)$/.exec(String(articleName || ""));
  return match ? Number(match[1]) : null;
}

function renderBlogForm(response, options) {
  response.status(options.status || 200).render("blog-create", {
    activePage: "blog",
    currentUser: options.currentUser,
    errors: options.errors || {},
    formAction: options.formAction,
    formData: options.formData || {},
    formMode: options.formMode,
    formTitle: options.formTitle,
    submitLabel: options.submitLabel,
  });
}

function createBlogRouter() {
  const router = express.Router();

  router.get("/blogs-data", async (request, response) => {
    response.json(await listBlogPosts(request.app.locals.database));
  });

  router.get("/blogs", async (request, response) => {
    response.render("blogs", {
      activePage: "blog",
      currentUser: request.currentUser,
      posts: await listBlogPosts(request.app.locals.database),
    });
  });

  router.get("/blog-create", requireLogin, (request, response) => {
    renderBlogForm(response, {
      currentUser: request.currentUser,
      formAction: "/blog-create",
      formData: {},
      formMode: "create",
      formTitle: "Create New Blog Post",
      submitLabel: "Publish Post",
    });
  });

  router.post("/blog-create", requireLogin, handleBlogImageUpload, async (request, response) => {
    const uploadedImage = getUploadedBlogImagePath(request);
    const formData = getBlogFormData(request.body, uploadedImage);
    const { errors, tags } = validateBlogForm(formData);

    if (request.blogImageUploadError) {
      errors.image = request.blogImageUploadError;
    }

    if (Object.keys(errors).length > 0) {
      await removeUploadedBlogImage(uploadedImage);
      formData.image = "";
      renderBlogForm(response, {
        currentUser: request.currentUser,
        errors,
        formAction: "/blog-create",
        formData,
        formMode: "create",
        formTitle: "Create New Blog Post",
        status: 400,
        submitLabel: "Publish Post",
      });
      return;
    }

    let postId;

    try {
      postId = await createBlogPost(request.app.locals.database, {
        authorId: request.currentUser.id,
        category: formData.category,
        content: splitContentIntoParagraphs(formData.content),
        image: formData.image,
        summary: formData.summary,
        tags,
        title: formData.title,
      });
    } catch (error) {
      await removeUploadedBlogImage(uploadedImage);
      throw error;
    }

    response.redirect(`/blog-articles/blog${postId}`);
  });

  router.get("/blog-articles/:article/edit", requireLogin, async (request, response, next) => {
    const postId = getPostId(request.params.article);
    const post = postId
      ? await findBlogPostById(request.app.locals.database, postId)
      : null;

    if (!post) {
      next();
      return;
    }

    if (post.authorId !== request.currentUser.id) {
      response.status(403).send("You can only edit your own blog posts.");
      return;
    }

    renderBlogForm(response, {
      currentUser: request.currentUser,
      formAction: `/blog-articles/blog${post.id}/edit`,
      formData: {
        title: post.title,
        category: post.category,
        tags: post.tags.join(", "),
        summary: post.summary,
        image: post.image,
        content: post.content.join("\n\n"),
      },
      formMode: "edit",
      formTitle: "Edit Blog Post",
      submitLabel: "Save Changes",
    });
  });

  router.post("/blog-articles/:article/edit", requireLogin, async (request, response, next) => {
    const postId = getPostId(request.params.article);
    const post = postId
      ? await findBlogPostById(request.app.locals.database, postId)
      : null;

    if (!post) {
      next();
      return;
    }

    if (post.authorId !== request.currentUser.id) {
      response.status(403).send("You can only edit your own blog posts.");
      return;
    }

    request.blogPost = post;
    next();
  }, handleBlogImageUpload, async (request, response) => {
    const post = request.blogPost;
    const uploadedImage = getUploadedBlogImagePath(request);
    const formData = getBlogFormData(request.body, uploadedImage || post.image);
    const { errors, tags } = validateBlogForm(formData);

    if (request.blogImageUploadError) {
      errors.image = request.blogImageUploadError;
    }

    if (Object.keys(errors).length > 0) {
      await removeUploadedBlogImage(uploadedImage);
      formData.image = post.image;
      renderBlogForm(response, {
        currentUser: request.currentUser,
        errors,
        formAction: `/blog-articles/blog${post.id}/edit`,
        formData,
        formMode: "edit",
        formTitle: "Edit Blog Post",
        status: 400,
        submitLabel: "Save Changes",
      });
      return;
    }

    try {
      await updateBlogPost(request.app.locals.database, post.id, request.currentUser.id, {
        category: formData.category,
        content: splitContentIntoParagraphs(formData.content),
        image: formData.image,
        summary: formData.summary,
        tags,
        title: formData.title,
      });
    } catch (error) {
      await removeUploadedBlogImage(uploadedImage);
      throw error;
    }

    if (uploadedImage) {
      await removeUploadedBlogImage(post.image);
    }

    response.redirect(`/blog-articles/blog${post.id}`);
  });

  router.post("/blog-articles/:article/delete", async (request, response, next) => {
    const postId = getPostId(request.params.article);
    const post = postId
      ? await findBlogPostById(request.app.locals.database, postId)
      : null;

    if (!post) {
      next();
      return;
    }

    if (!request.currentUser) {
      response.redirect(`/login?next=${encodeURIComponent(`/blog-articles/blog${post.id}`)}`);
      return;
    }

    if (post.authorId !== request.currentUser.id) {
      response.status(403).send("You can only delete your own blog posts.");
      return;
    }

    await deleteBlogPost(request.app.locals.database, post.id, request.currentUser.id);
    await removeUploadedBlogImage(post.image);
    response.redirect("/blogs");
  });

  router.get("/blog-articles/:article", async (request, response, next) => {
    const postId = getPostId(request.params.article);
    const post = postId
      ? await findBlogPostById(request.app.locals.database, postId)
      : null;

    if (!post) {
      next();
      return;
    }

    response.render("blog-articles/article", {
      activePage: "blog",
      commentError: "",
      commentValue: "",
      currentUser: request.currentUser,
      post,
    });
  });

  router.post("/blog-articles/:article/comments", async (request, response, next) => {
    const postId = getPostId(request.params.article);
    const post = postId
      ? await findBlogPostById(request.app.locals.database, postId)
      : null;

    if (!post) {
      next();
      return;
    }

    if (!request.currentUser) {
      response.redirect(`/login?next=${encodeURIComponent(`/blog-articles/blog${post.id}`)}`);
      return;
    }

    const commentText = String(request.body.comment || "").trim();

    if (commentText.length < 3 || commentText.length > 500) {
      response.status(400).render("blog-articles/article", {
        activePage: "blog",
        commentError: "The comment must contain between 3 and 500 characters.",
        commentValue: commentText,
        currentUser: request.currentUser,
        post,
      });
      return;
    }

    await createBlogComment(
      request.app.locals.database,
      post.id,
      request.currentUser,
      commentText,
    );
    response.redirect(`/blog-articles/blog${post.id}#comments`);
  });

  return router;
}

module.exports = { createBlogRouter };
