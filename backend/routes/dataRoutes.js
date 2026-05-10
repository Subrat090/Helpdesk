const express = require("express");
const {
  getSchemes,
  getLatestSchemesList,
  recommendSchemes,
  getJobs,
  getFarmingTips,
} = require("../controllers/dataController");

const router = express.Router();

router.get("/schemes", getSchemes);
router.get("/schemes/latest", getLatestSchemesList);
router.post("/schemes/recommend", recommendSchemes);
router.get("/jobs", getJobs);
router.get("/farming", getFarmingTips);

module.exports = router;
