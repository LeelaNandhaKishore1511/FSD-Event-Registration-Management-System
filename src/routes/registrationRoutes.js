const express = require("express");
const auth = require("../middleware/auth");
const permit = require("../middleware/roles");
const {
  registerForEvent,
  myRegistrations,
  getEventRegistrations,
} = require("../controllers/registrationController");

const router = express.Router();

router.post("/", auth, registerForEvent);
router.get("/my", auth, myRegistrations);
router.get(
  "/event/:eventId",
  auth,
  permit("management", "organiser", "host"),
  getEventRegistrations,
);

module.exports = router;
