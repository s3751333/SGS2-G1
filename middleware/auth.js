const { findSessionUser, getSessionToken } = require("../services/sessionService");

async function loadCurrentUser(request, response, next) {
  try {
    const database = request.app.locals.database;
    const currentUser = await findSessionUser(database, getSessionToken(request));
    request.currentUser = currentUser;
    response.locals.currentUser = currentUser;
    next();
  } catch (error) {
    next(error);
  }
}

function requireLogin(request, response, next) {
  if (!request.currentUser) {
    response.redirect(`/login?next=${encodeURIComponent(request.originalUrl)}`);
    return;
  }

  next();
}

function requireAdmin(request, response, next) {
  if (!request.currentUser) {
    response.redirect(`/login?next=${encodeURIComponent(request.originalUrl)}`);
    return;
  }

  if (request.currentUser.role !== "admin") {
    response.status(403).send("Administrator access is required.");
    return;
  }

  next();
}

function requireApiLogin(request, response, next) {
  if (!request.currentUser) {
    response.status(401).json({ message: "Please sign in to manage your cart and orders." });
    return;
  }

  next();
}

module.exports = {
  loadCurrentUser,
  requireAdmin,
  requireApiLogin,
  requireLogin,
};
