const express = require("express");
const auth = require("../middleware/auth");
const permit = require("../middleware/roles");
const {
  createMainEvent,
  getMainEvents,
  deleteMainEvent,
  updateMainEvent,
} = require("../controllers/mainEventController");

const router = express.Router();

router.post("/", auth, permit("organiser", "host"), createMainEvent);
router.get("/", auth, getMainEvents);
router.delete("/:id", auth, permit("organiser", "host"), deleteMainEvent);
router.put("/:id", auth, permit("organiser", "host"), updateMainEvent);

module.exports = router;
