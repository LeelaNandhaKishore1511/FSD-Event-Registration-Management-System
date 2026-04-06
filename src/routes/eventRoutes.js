const express = require("express");
const auth = require("../middleware/auth");
const permit = require("../middleware/roles");
const {
  createEvent,
  getEvents,
  deleteEvent,
  updateEvent,
} = require("../controllers/eventController");

const router = express.Router();

router.post("/", auth, permit("management", "organiser", "host"), createEvent);
router.get("/", auth, getEvents);
router.delete(
  "/:id",
  auth,
  permit("management", "organiser", "host"),
  deleteEvent,
);
router.put(
  "/:id",
  auth,
  permit("management", "organiser", "host"),
  updateEvent,
);

module.exports = router;
