const express = require("express");
const auth = require("../middleware/auth");
const { chatbot } = require("../controllers/chatbotController");

const router = express.Router();

router.post(
  "/",
  (req, res, next) => {
    const hasToken = (req.headers.authorization || "").startsWith("Bearer ");
    if (!hasToken) return next();
    return auth(req, res, next);
  },
  chatbot,
);

module.exports = router;
