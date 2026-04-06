const express = require("express");
const auth = require("../middleware/auth");
const permit = require("../middleware/roles");
const {
  createOrganiser,
  createManagement,
  getOrganisers,
  deleteOrganiser,
  getManagementUsers,
  deleteManagementUser,
} = require("../controllers/usersController");

const router = express.Router();

router.post("/create-organiser", auth, permit("host"), createOrganiser);
router.post("/create-management", auth, permit("organiser"), createManagement);
router.get("/organisers", auth, permit("host"), getOrganisers);
router.delete("/organisers/:id", auth, permit("host"), deleteOrganiser);
router.get("/management", auth, permit("organiser"), getManagementUsers);
router.delete(
  "/management/:id",
  auth,
  permit("organiser"),
  deleteManagementUser,
);

module.exports = router;
