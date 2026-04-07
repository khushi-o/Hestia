const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/auth.middleware");
const { nlSearchRateLimit } = require("../middleware/rateLimit.middleware");
const { search } = require("../controllers/search.controller");

router.use(protect);
router.get("/", nlSearchRateLimit, search);

module.exports = router;
