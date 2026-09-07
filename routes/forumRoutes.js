const express = require("express");
const { requireLogin } = require("../middleware/auth");
const { findForumRecord, listForumTopics, listForumReplies, createForumRecord, updateForumRecord, getForumAuthors } = require("../repositories/forumRepository");

const forumCategories = {
  english: "English Books",
  vietnamese: "Vietnamese Books",
  "board-games": "Board Games",
};

const forumImages = [
  { value: "img/book.jpg", label: "Books" },
  { value: "img/little_prince.jpg", label: "The Little Prince" },
  { value: "img/eng_use.jpg", label: "English learning" },
  { value: "img/catan_bg.jpg", label: "Board games" },
];

function createForumRouter() {
  const router = express.Router();

  function getForumFormData(body) {
    return {
      category: String(body.category || "").trim(),
      title: String(body.title || "").trim(),
      content: String(body.content || "").trim(),
      image: String(body.image || "").trim(),
    };
  }

  function validateForumPost(formData) {
    const errors = {};

    if (!Object.hasOwn(forumCategories, formData.category)) {
      errors.category = "Please select a valid category.";
    }

    if (formData.title.length < 5 || formData.title.length > 100) {
      errors.title = "The title must contain between 5 and 100 characters.";
    }

    if (formData.content.length < 20 || formData.content.length > 2000) {
      errors.content = "The message must contain between 20 and 2000 characters.";
    }

    if (!forumImages.some((image) => image.value === formData.image)) {
      errors.image = "Please select a valid image.";
    }

    return errors;
  }

  function getReplyFormData(body) {
    const parentReplyId = String(body.parentReplyId || "").trim();

    return {
      title: String(body.title || "").trim(),
      content: String(body.content || "").trim(),
      image: String(body.image || "").trim(),
      parentReplyId: parentReplyId ? Number(parentReplyId) : null,
      parentReplyIdIsValid: !parentReplyId || /^\d+$/.test(parentReplyId),
    };
  }

  async function validateForumReply(database, formData, topicId) {
    const errors = {};

    if (formData.title.length < 3 || formData.title.length > 100) {
      errors.title = "The reply title must contain between 3 and 100 characters.";
    }

    if (formData.content.length < 3 || formData.content.length > 1000) {
      errors.content = "The reply must contain between 3 and 1000 characters.";
    }

    if (!forumImages.some((image) => image.value === formData.image)) {
      errors.image = "Please select a valid image.";
    }

    if (!formData.parentReplyIdIsValid || (formData.parentReplyId !== null && formData.parentReplyId < 1)) {
      errors.parentReplyId = "The selected parent reply is not valid.";
    } else if (formData.parentReplyId !== null) {
      const parentReply = await findForumRecord(database, "forumReplies", formData.parentReplyId);

      if (!parentReply || parentReply.topicId !== Number(topicId)) {
        errors.parentReplyId = "The selected parent reply is not valid.";
      }
    }

    return errors;
  }

  function formatForumDate(value) {
    return new Intl.DateTimeFormat("en-AU", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Australia/Melbourne",
    }).format(new Date(value));
  }

  async function getForumTopicView(database, topic) {
    const replies = await listForumReplies(database, topic.id);
    const authors = await getForumAuthors(database, [topic, ...replies]);
    const lastActivity = replies.reduce((latest, reply) => reply.createdAt > latest ? reply.createdAt : latest, topic.createdAt);
    return {
      ...topic,
      createdAt: topic.createdAt.toISOString(),
      author: authors.get(topic.authorId) || "Unknown user",
      categoryLabel: forumCategories[topic.category],
      createdLabel: formatForumDate(topic.createdAt),
      lastActivity: lastActivity.toISOString(),
      replyCount: replies.length,
      searchText: [topic.title, topic.content, authors.get(topic.authorId), forumCategories[topic.category],
        ...replies.flatMap((reply) => [reply.title, reply.content, authors.get(reply.authorId)])].join(" ").toLowerCase(),
    };
  }

  async function getForumReplyViews(database, topicId) {
    const replies = await listForumReplies(database, topicId);
    const authors = await getForumAuthors(database, replies);
    const byId = new Map(replies.map((reply) => [reply.id, reply]));
    const byParent = new Map();
    for (const reply of replies) {
      const parentId = byId.has(reply.parentReplyId) ? reply.parentReplyId : null;
      if (!byParent.has(parentId)) byParent.set(parentId, []);
      byParent.get(parentId).push(reply);
    }
    const ordered = [];
    const pending = (byParent.get(null) || []).map((reply) => ({ reply, depth: 0 })).reverse();
    while (pending.length) {
      const { reply, depth } = pending.pop();
      const parent = byId.get(reply.parentReplyId);
      ordered.push({ ...reply, depth, author: authors.get(reply.authorId) || "Unknown user",
        createdLabel: formatForumDate(reply.createdAt), parentAuthor: parent ? authors.get(parent.authorId) || "Unknown user" : "" });
      for (const child of [...(byParent.get(reply.id) || [])].reverse()) pending.push({ reply: child, depth: depth + 1 });
    }
    return ordered;
  }

  function renderTopicForm(response, options) {
    response.status(options.status || 200).render("forum-new-topic", {
      activePage: "forum",
      errors: options.errors || {},
      formAction: options.formAction,
      formData: options.formData || {},
      formMode: options.formMode,
      forumCategories,
      forumImages,
      pageTitle: options.pageTitle,
      submitLabel: options.submitLabel,
    });
  }

  async function renderForumTopic(response, topic, options = {}) {
    const database = response.app.locals.database;
    const replies = await getForumReplyViews(database, topic.id);

    response.status(options.status || 200).render("forum-topic", {
      activePage: "forum",
      currentUser: response.locals.currentUser,
      errors: options.errors || {},
      formData: options.formData || {},
      forumImages,
      replies,
      topic: await getForumTopicView(response.app.locals.database, topic),
    });
  }

  router.get("/forum-main", async (request, response) => {
    response.render("forum-main", {
      activePage: "forum",
      currentUser: response.locals.currentUser,
      forumCategories,
      topics: await Promise.all((await listForumTopics(request.app.locals.database)).map((topic) => getForumTopicView(request.app.locals.database, topic))),
    });
  });

  router.get("/forum-new-topic", requireLogin, async (request, response) => {
    renderTopicForm(response, {
      formAction: "/forum-new-topic",
      formMode: "create",
      pageTitle: "Start a new discussion",
      submitLabel: "Publish discussion",
    });
  });

  router.post("/forum-new-topic", requireLogin, async (request, response) => {
    const formData = getForumFormData(request.body);
    const errors = validateForumPost(formData);

    if (Object.keys(errors).length > 0) {
      renderTopicForm(response, {
        errors,
        formAction: "/forum-new-topic",
        formData,
        formMode: "create",
        pageTitle: "Start a new discussion",
        status: 400,
        submitLabel: "Publish discussion",
      });
      return;
    }

    const topic = await createForumRecord(request.app.locals.database, "forumTopics", {
      authorId: request.currentUser.id,
      category: formData.category,
      title: formData.title,
      content: formData.content,
      image: formData.image,
      views: 0,
      deleted: false,
    });
    response.redirect(`/forum-topic/${topic.id}`);
  });

  router.get("/forum-topic/:topicId", async (request, response, next) => {
    const topic = await findForumRecord(request.app.locals.database, "forumTopics", request.params.topicId);

    if (!topic) {
      next();
      return;
    }

    await request.app.locals.database.collection("forumTopics").updateOne({ _id: topic.id, deleted: false }, { $inc: { views: 1 } });
    topic.views += 1;
    await renderForumTopic(response, topic);
  });

  router.post("/forum-topic/:topicId/replies", requireLogin, async (request, response, next) => {
    const topic = await findForumRecord(request.app.locals.database, "forumTopics", request.params.topicId);

    if (!topic) {
      next();
      return;
    }

    const formData = getReplyFormData(request.body);
    const errors = await validateForumReply(request.app.locals.database, formData, topic.id);

    if (Object.keys(errors).length > 0) {
      await renderForumTopic(response, topic, { errors, formData, status: 400 });
      return;
    }

    await createForumRecord(request.app.locals.database, "forumReplies", {
      topicId: topic.id,
      parentReplyId: formData.parentReplyId,
      authorId: request.currentUser.id,
      title: formData.title,
      content: formData.content,
      image: formData.image,
      deleted: false,
    });

    response.redirect(`/forum-topic/${topic.id}#replies`);
  });

  router.get("/forum-topic/:topicId/edit", requireLogin, async (request, response, next) => {
    const topic = await findForumRecord(request.app.locals.database, "forumTopics", request.params.topicId);

    if (!topic) {
      next();
      return;
    }

    if (topic.authorId !== request.currentUser.id) {
      response.status(403).send("You can only edit your own discussion.");
      return;
    }

    renderTopicForm(response, {
      formAction: `/forum-topic/${topic.id}/edit`,
      formData: topic,
      formMode: "edit",
      pageTitle: "Edit discussion",
      submitLabel: "Save changes",
    });
  });

  router.post("/forum-topic/:topicId/edit", requireLogin, async (request, response, next) => {
    const topic = await findForumRecord(request.app.locals.database, "forumTopics", request.params.topicId);

    if (!topic) {
      next();
      return;
    }

    if (topic.authorId !== request.currentUser.id) {
      response.status(403).send("You can only edit your own discussion.");
      return;
    }

    const formData = getForumFormData(request.body);
    const errors = validateForumPost(formData);

    if (Object.keys(errors).length > 0) {
      renderTopicForm(response, {
        errors,
        formAction: `/forum-topic/${topic.id}/edit`,
        formData,
        formMode: "edit",
        pageTitle: "Edit discussion",
        status: 400,
        submitLabel: "Save changes",
      });
      return;
    }

    await updateForumRecord(request.app.locals.database, "forumTopics", topic, request.currentUser.id, formData);
    response.redirect(`/forum-topic/${topic.id}`);
  });

  router.post("/forum-topic/:topicId/delete", requireLogin, async (request, response, next) => {
    const topic = await findForumRecord(request.app.locals.database, "forumTopics", request.params.topicId);

    if (!topic) {
      next();
      return;
    }

    if (topic.authorId !== request.currentUser.id) {
      response.status(403).send("You can only delete your own discussion.");
      return;
    }

    await updateForumRecord(request.app.locals.database, "forumTopics", topic, request.currentUser.id, { deleted: true, deletedAt: new Date() });
    response.redirect("/forum-main");
  });

  router.get("/forum-topic/:topicId/replies/:replyId/edit", requireLogin, async (request, response, next) => {
    const topic = await findForumRecord(request.app.locals.database, "forumTopics", request.params.topicId);
    const reply = await findForumRecord(request.app.locals.database, "forumReplies", request.params.replyId);

    if (!topic || !reply || reply.topicId !== topic.id) {
      next();
      return;
    }

    if (reply.authorId !== request.currentUser.id) {
      response.status(403).send("You can only edit your own reply.");
      return;
    }

    response.render("forum-edit-reply", {
      activePage: "forum",
      errors: {},
      formData: reply,
      forumImages,
      topic: await getForumTopicView(response.app.locals.database, topic),
    });
  });

  router.post("/forum-topic/:topicId/replies/:replyId/edit", requireLogin, async (request, response, next) => {
    const topic = await findForumRecord(request.app.locals.database, "forumTopics", request.params.topicId);
    const reply = await findForumRecord(request.app.locals.database, "forumReplies", request.params.replyId);

    if (!topic || !reply || reply.topicId !== topic.id) {
      next();
      return;
    }

    if (reply.authorId !== request.currentUser.id) {
      response.status(403).send("You can only edit your own reply.");
      return;
    }

    const formData = getReplyFormData(request.body);
    // The parent cannot be changed from the edit form, so validate only editable fields.
    formData.parentReplyId = null;
    formData.parentReplyIdIsValid = true;
    const errors = await validateForumReply(request.app.locals.database, formData, topic.id);

    if (Object.keys(errors).length > 0) {
      response.status(400).render("forum-edit-reply", {
        activePage: "forum",
        errors,
        formData: { ...formData, id: reply.id },
        forumImages,
        topic: await getForumTopicView(response.app.locals.database, topic),
      });
      return;
    }

    await updateForumRecord(request.app.locals.database, "forumReplies", reply, request.currentUser.id,
      { title: formData.title, content: formData.content, image: formData.image });
    response.redirect(`/forum-topic/${topic.id}#reply-${reply.id}`);
  });

  router.post("/forum-topic/:topicId/replies/:replyId/delete", requireLogin, async (request, response, next) => {
    const topic = await findForumRecord(request.app.locals.database, "forumTopics", request.params.topicId);
    const reply = await findForumRecord(request.app.locals.database, "forumReplies", request.params.replyId);

    if (!topic || !reply || reply.topicId !== topic.id) {
      next();
      return;
    }

    if (reply.authorId !== request.currentUser.id) {
      response.status(403).send("You can only delete your own reply.");
      return;
    }

    await updateForumRecord(request.app.locals.database, "forumReplies", reply, request.currentUser.id, { deleted: true, deletedAt: new Date() });
    response.redirect(`/forum-topic/${topic.id}#replies`);
  });

  return router;
}

module.exports = { createForumRouter };
