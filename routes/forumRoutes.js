const express = require("express");
const { requireLogin } = require("../middleware/auth");

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

function createForumRouter({ users, forumTopics, forumReplies }) {
  const router = express.Router();

  function findForumTopic(topicId) {
    return forumTopics.find((topic) => topic.id === Number(topicId) && !topic.deleted) || null;
  }

  function findForumReply(replyId) {
    return forumReplies.find((reply) => reply.id === Number(replyId) && !reply.deleted) || null;
  }

  function getNextId(records) {
    return records.length > 0 ? Math.max(...records.map((record) => record.id)) + 1 : 1;
  }

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

    if (!forumCategories[formData.category]) {
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

  function validateForumReply(formData, topicId) {
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
      const parentReply = findForumReply(formData.parentReplyId);

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

  function getForumTopicView(topic) {
    const replies = forumReplies.filter((reply) => reply.topicId === topic.id && !reply.deleted);
    const lastActivity = replies.reduce(
      (latest, reply) => reply.createdAt > latest ? reply.createdAt : latest,
      topic.createdAt,
    );
    const author = users.find((user) => user.id === topic.authorId);
    const replySearchText = replies.map((reply) => {
      const replyAuthor = users.find((user) => user.id === reply.authorId);
      return [reply.title, reply.content, replyAuthor ? replyAuthor.fullName : ""].join(" ");
    }).join(" ");

    return {
      ...topic,
      author: author ? author.fullName : "Unknown user",
      categoryLabel: forumCategories[topic.category],
      createdLabel: formatForumDate(topic.createdAt),
      lastActivity,
      replyCount: replies.length,
      searchText: [topic.title, topic.content, author ? author.fullName : "", forumCategories[topic.category], replySearchText]
        .join(" ")
        .toLowerCase(),
    };
  }

  function getForumReplyView(reply) {
    const author = users.find((user) => user.id === reply.authorId);
    const parentReply = reply.parentReplyId ? findForumReply(reply.parentReplyId) : null;
    const parentAuthor = parentReply
      ? users.find((user) => user.id === parentReply.authorId)
      : null;

    return {
      ...reply,
      author: author ? author.fullName : "Unknown user",
      createdLabel: formatForumDate(reply.createdAt),
      parentAuthor: parentAuthor ? parentAuthor.fullName : "",
    };
  }

  function getForumReplyViews(topicId) {
    const replies = forumReplies.filter((reply) => reply.topicId === topicId && !reply.deleted);
    const replyIds = new Set(replies.map((reply) => reply.id));
    const repliesByParent = new Map();

    replies.forEach((reply) => {
      const parentId = replyIds.has(reply.parentReplyId) ? reply.parentReplyId : null;
      const siblings = repliesByParent.get(parentId) || [];
      siblings.push(reply);
      repliesByParent.set(parentId, siblings);
    });

    const orderedReplies = [];

    function addReplies(parentId, depth) {
      const children = repliesByParent.get(parentId) || [];
      children
        .sort((replyA, replyB) => replyA.createdAt.localeCompare(replyB.createdAt))
        .forEach((reply) => {
          orderedReplies.push({ ...getForumReplyView(reply), depth });
          addReplies(reply.id, depth + 1);
        });
    }

    addReplies(null, 0);
    return orderedReplies;
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

  function renderForumTopic(response, topic, options = {}) {
    const replies = getForumReplyViews(topic.id);

    response.status(options.status || 200).render("forum-topic", {
      activePage: "forum",
      currentUser: response.locals.currentUser,
      errors: options.errors || {},
      formData: options.formData || {},
      forumImages,
      replies,
      topic: getForumTopicView(topic),
    });
  }

  router.get("/forum-main", (request, response) => {
    response.render("forum-main", {
      activePage: "forum",
      currentUser: response.locals.currentUser,
      forumCategories,
      topics: forumTopics.filter((topic) => !topic.deleted).map(getForumTopicView),
    });
  });

  router.get("/forum-new-topic", requireLogin, (request, response) => {
    renderTopicForm(response, {
      formAction: "/forum-new-topic",
      formMode: "create",
      pageTitle: "Start a new discussion",
      submitLabel: "Publish discussion",
    });
  });

  router.post("/forum-new-topic", requireLogin, (request, response) => {
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

    const topic = {
      id: getNextId(forumTopics),
      authorId: request.currentUser.id,
      category: formData.category,
      title: formData.title,
      content: formData.content,
      image: formData.image,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      views: 0,
      deleted: false,
    };

    forumTopics.push(topic);
    response.redirect(`/forum-topic/${topic.id}`);
  });

  router.get("/forum-topic/:topicId", (request, response, next) => {
    const topic = findForumTopic(request.params.topicId);

    if (!topic) {
      next();
      return;
    }

    topic.views += 1;
    renderForumTopic(response, topic);
  });

  router.post("/forum-topic/:topicId/replies", requireLogin, (request, response, next) => {
    const topic = findForumTopic(request.params.topicId);

    if (!topic) {
      next();
      return;
    }

    const formData = getReplyFormData(request.body);
    const errors = validateForumReply(formData, topic.id);

    if (Object.keys(errors).length > 0) {
      renderForumTopic(response, topic, { errors, formData, status: 400 });
      return;
    }

    forumReplies.push({
      id: getNextId(forumReplies),
      topicId: topic.id,
      parentReplyId: formData.parentReplyId,
      authorId: request.currentUser.id,
      title: formData.title,
      content: formData.content,
      image: formData.image,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      deleted: false,
    });

    response.redirect(`/forum-topic/${topic.id}#replies`);
  });

  router.get("/forum-topic/:topicId/edit", requireLogin, (request, response, next) => {
    const topic = findForumTopic(request.params.topicId);

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

  router.post("/forum-topic/:topicId/edit", requireLogin, (request, response, next) => {
    const topic = findForumTopic(request.params.topicId);

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

    topic.category = formData.category;
    topic.title = formData.title;
    topic.content = formData.content;
    topic.image = formData.image;
    topic.updatedAt = new Date().toISOString();
    response.redirect(`/forum-topic/${topic.id}`);
  });

  router.post("/forum-topic/:topicId/delete", requireLogin, (request, response, next) => {
    const topic = findForumTopic(request.params.topicId);

    if (!topic) {
      next();
      return;
    }

    if (topic.authorId !== request.currentUser.id) {
      response.status(403).send("You can only delete your own discussion.");
      return;
    }

    topic.deleted = true;
    topic.updatedAt = new Date().toISOString();
    response.redirect("/forum-main");
  });

  router.get("/forum-topic/:topicId/replies/:replyId/edit", requireLogin, (request, response, next) => {
    const topic = findForumTopic(request.params.topicId);
    const reply = findForumReply(request.params.replyId);

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
      topic: getForumTopicView(topic),
    });
  });

  router.post("/forum-topic/:topicId/replies/:replyId/edit", requireLogin, (request, response, next) => {
    const topic = findForumTopic(request.params.topicId);
    const reply = findForumReply(request.params.replyId);

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
    const errors = validateForumReply(formData, topic.id);

    if (Object.keys(errors).length > 0) {
      response.status(400).render("forum-edit-reply", {
        activePage: "forum",
        errors,
        formData: { ...formData, id: reply.id },
        forumImages,
        topic: getForumTopicView(topic),
      });
      return;
    }

    reply.title = formData.title;
    reply.content = formData.content;
    reply.image = formData.image;
    reply.updatedAt = new Date().toISOString();
    response.redirect(`/forum-topic/${topic.id}#reply-${reply.id}`);
  });

  router.post("/forum-topic/:topicId/replies/:replyId/delete", requireLogin, (request, response, next) => {
    const topic = findForumTopic(request.params.topicId);
    const reply = findForumReply(request.params.replyId);

    if (!topic || !reply || reply.topicId !== topic.id) {
      next();
      return;
    }

    if (reply.authorId !== request.currentUser.id) {
      response.status(403).send("You can only delete your own reply.");
      return;
    }

    reply.deleted = true;
    reply.updatedAt = new Date().toISOString();
    response.redirect(`/forum-topic/${topic.id}#replies`);
  });

  return router;
}

module.exports = { createForumRouter };
