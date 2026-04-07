const express = require("express");
const router = express.Router();
const {
  getClients,
  createClient,
  updateClient,
  deleteClient,
} = require("../controllers/client.controller");
const { protect } = require("../middleware/auth.middleware");
const { requireAgency } = require("../middleware/role.middleware");

router.use(protect);
router.use(requireAgency);

router.get("/", getClients);
router.post("/", createClient);
router.put("/:id", updateClient);
router.delete("/:id", deleteClient);

module.exports = router;