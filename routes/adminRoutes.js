const express = require("express");
const { requireAdmin } = require("../middleware/auth");
const {
  findUserById,
  listUsers,
  updateUser,
} = require("../repositories/userRepository");
const { deleteUserSessions } = require("../services/sessionService");

function createAdminRouter() {
  const router = express.Router();

  router.get("/admin-users", requireAdmin, async (request, response) => {
    response.render("admin-users", {
      activePage: "",
      currentUser: request.currentUser,
      users: await listUsers(request.app.locals.database),
    });
  });

  router.post("/admin-users/:userId/status", requireAdmin, async (request, response) => {
    const database = request.app.locals.database;
    const user = await findUserById(database, request.params.userId);
    const status = String(request.body.status || "");

    if (!user) {
      response.status(404).json({ message: "User not found." });
      return;
    }

    if (user.id === request.currentUser.id) {
      response.status(400).json({ message: "You cannot lock your own account." });
      return;
    }

    if (!["active", "locked"].includes(status)) {
      response.status(400).json({ message: "Please select a valid account status." });
      return;
    }

    const updatedUser = await updateUser(database, user.id, { status });

    if (status === "locked") {
      await deleteUserSessions(database, user.id);
    }

    response.json({
      message: `${user.fullName} is now ${status === "active" ? "enabled" : "disabled"}.`,
      status: updatedUser.status,
    });
  });

  return router;
}

module.exports = { createAdminRouter };
