const express = require("express");
const { chatWithAgent } = require("../controllers/chatController");

const router = express.Router();

router.post("/chat", chatWithAgent);

module.exports = router;
