const express = require("express");
const auth = require("../middleware/auth");
const {
  createTeam,
  addMember,
  removeMember,
  myTeams,
} = require("../controllers/teamController");

const router = express.Router();

router.post("/create", auth, createTeam);
router.post("/add-member", auth, addMember);
router.delete("/remove-member", auth, removeMember);
router.get("/my", auth, myTeams);

module.exports = router;
