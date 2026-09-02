const express = require("express");
const {
  createUser,
  findUserByEmail,
  findUserById,
  findUserByUsernameOrEmail,
  updateUser,
} = require("../repositories/userRepository");
const {
  createPasswordReset,
  deletePasswordReset,
  findPasswordReset,
} = require("../services/passwordResetService");
const {
  clearSessionCookie,
  createSession,
  deleteSession,
  deleteUserSessions,
  getSessionToken,
  setSessionCookie,
} = require("../services/sessionService");
const {
  checkSecret,
  hashSecret,
  normalizeSecurityAnswer,
} = require("../utils/security");

const securityQuestions = [
  "What is your favourite animal?",
  "What is your favourite book?",
  "What is your favourite colour?",
];

function getDatabase(request) {
  return request.app.locals.database;
}

function getSafeNextPage(value) {
  const nextPage = String(value || "");
  return nextPage.startsWith("/") && !nextPage.startsWith("//") ? nextPage : "/blogs";
}

function getPublicUser(user) {
  return {
    id: user.id,
    fullName: user.fullName,
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

function createAuthRouter() {
  const router = express.Router();

  router.get("/login", (request, response) => {
    if (request.currentUser) {
      response.redirect("/blogs");
      return;
    }

    response.render("login", {
      activePage: "",
      nextPage: getSafeNextPage(request.query.next),
    });
  });

  router.get("/register", (request, response) => {
    if (request.currentUser) {
      response.redirect("/blogs");
      return;
    }

    response.render("register", {
      activePage: "",
      securityQuestions,
    });
  });

  router.get("/forgot-password", (request, response) => {
    response.render("forgot-password", {
      activePage: "",
      securityQuestions,
    });
  });

  router.post("/forgot-password", async (request, response) => {
    const email = String(request.body.email || "").trim().toLowerCase();
    const answers = [
      request.body.securityAnswer1,
      request.body.securityAnswer2,
      request.body.securityAnswer3,
    ].map(normalizeSecurityAnswer);

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      response.status(400).json({ message: "Enter a valid email address." });
      return;
    }

    if (answers.some((answer) => answer.length < 2 || answer.length > 80)) {
      response.status(400).json({ message: "Answer all three security questions." });
      return;
    }

    const database = getDatabase(request);
    const user = await findUserByEmail(database, email);
    const answersAreCorrect = user
      && Array.isArray(user.securityAnswerHashes)
      && user.securityAnswerHashes.length === answers.length
      && answers.every((answer, index) => checkSecret(answer, user.securityAnswerHashes[index]));

    if (!answersAreCorrect) {
      response.status(401).json({ message: "The email or security answers are incorrect." });
      return;
    }

    const token = await createPasswordReset(database, user.id);
    response.json({
      message: "Your answers are correct. You can now choose a new password.",
      redirectTo: `/reset-password?token=${token}`,
    });
  });

  router.get("/reset-password", async (request, response) => {
    const token = String(request.query.token || "");
    const resetRequest = await findPasswordReset(getDatabase(request), token);

    response.render("reset-password", {
      activePage: "",
      token,
      tokenIsValid: Boolean(resetRequest),
    });
  });

  router.post("/reset-password", async (request, response) => {
    const token = String(request.body.token || "");
    const password = String(request.body.password || "");
    const confirmPassword = String(request.body.confirmPassword || "");
    const database = getDatabase(request);
    const resetRequest = await findPasswordReset(database, token);

    if (!resetRequest) {
      await deletePasswordReset(database, token);
      response.status(400).json({ message: "This password reset session is invalid or has expired." });
      return;
    }

    if (password.length < 8 || password.length > 72 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      response.status(400).json({ message: "Use 8 characters, a capital letter, and a number." });
      return;
    }

    if (password !== confirmPassword) {
      response.status(400).json({ message: "The passwords do not match." });
      return;
    }

    const user = await findUserById(database, resetRequest.userId);

    if (!user) {
      await deletePasswordReset(database, token);
      response.status(404).json({ message: "The user account no longer exists." });
      return;
    }

    await updateUser(database, user.id, { passwordHash: hashSecret(password) });
    await deletePasswordReset(database, token);
    await deleteUserSessions(database, user.id);

    response.json({
      message: "Password changed successfully.",
      redirectTo: "/login",
    });
  });

  router.post("/register", async (request, response) => {
    const fullName = String(request.body.fullName || "").trim();
    const username = String(request.body.username || "").trim();
    const email = String(request.body.email || "").trim().toLowerCase();
    const introduction = String(request.body.introduction || "").trim();
    const password = String(request.body.password || "");
    const confirmPassword = String(request.body.confirmPassword || "");
    const securityAnswers = [
      request.body.securityAnswer1,
      request.body.securityAnswer2,
      request.body.securityAnswer3,
    ].map(normalizeSecurityAnswer);

    if (fullName.length < 2 || fullName.length > 80) {
      response.status(400).json({ message: "The full name must contain between 2 and 80 characters." });
      return;
    }

    if (!/^[A-Za-z0-9_]{3,24}$/.test(username)) {
      response.status(400).json({ message: "The username is not valid." });
      return;
    }

    if (email.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      response.status(400).json({ message: "The email address is not valid." });
      return;
    }

    if (introduction.length > 300) {
      response.status(400).json({ message: "The introduction cannot exceed 300 characters." });
      return;
    }

    if (password.length < 8 || password.length > 72 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      response.status(400).json({ message: "The password is not valid." });
      return;
    }

    if (password !== confirmPassword) {
      response.status(400).json({ message: "The passwords do not match." });
      return;
    }

    if (securityAnswers.some((answer) => answer.length < 2 || answer.length > 80)) {
      response.status(400).json({ message: "Each security answer must contain between 2 and 80 characters." });
      return;
    }

    const database = getDatabase(request);
    const existingUser = await findUserByUsernameOrEmail(database, username, email);

    if (existingUser) {
      response.status(409).json({ message: "The username or email is already registered." });
      return;
    }

    try {
      const newUser = await createUser(database, {
        fullName,
        username,
        email,
        introduction,
        passwordHash: hashSecret(password),
        securityAnswerHashes: securityAnswers.map((answer) => hashSecret(answer)),
        role: "member",
        status: "active",
      });

      response.status(201).json({
        message: "Registration successful.",
        user: getPublicUser(newUser),
      });
    } catch (error) {
      if (error.code === 11000) {
        response.status(409).json({ message: "The username or email is already registered." });
        return;
      }
      throw error;
    }
  });

  router.post("/login", async (request, response) => {
    const email = String(request.body.email || "").trim().toLowerCase();
    const password = String(request.body.password || "");
    const database = getDatabase(request);
    const user = await findUserByEmail(database, email);

    if (!user || !checkSecret(password, user.passwordHash)) {
      response.status(401).json({ message: "Incorrect email or password." });
      return;
    }

    if (user.status !== "active") {
      response.status(403).json({ message: "This account is not active." });
      return;
    }

    const token = await createSession(database, user.id);
    setSessionCookie(response, token);
    response.json({
      message: "Login successful.",
      redirectTo: getSafeNextPage(request.body.next),
      user: getPublicUser(user),
    });
  });

  router.get("/session", (request, response) => {
    response.json({
      user: request.currentUser ? getPublicUser(request.currentUser) : null,
    });
  });

  router.post("/logout", async (request, response) => {
    await deleteSession(getDatabase(request), getSessionToken(request));
    clearSessionCookie(response);
    response.json({ message: "Logout successful." });
  });

  return router;
}

module.exports = { createAuthRouter };
