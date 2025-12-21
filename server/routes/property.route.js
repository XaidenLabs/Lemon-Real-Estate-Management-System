const {
  uploadProperty,
  getProperties,
  getProperty,
  updateProperty,
  toggleSaveProperty,
  incrementVideoView,
  searchProperty,
  deleteProperty,
  getAgentMetrics,
  getRecommendations,
} = require("../controllers/property.controller");
const { authenticate } = require("../middlewares/authenticate");
const {
  requireActiveSubscription,
} = require("../middlewares/requireActiveSubscription");
const { requireVerification } = require("../middlewares/requireVerification");

const router = require("express").Router();

router.post(
  "/upload",
  authenticate,
  requireVerification,
  requireActiveSubscription,
  uploadProperty,
);
router.get("/all", authenticate, getProperties);
router.get("/:id", authenticate, getProperty);
router.get("/metrics/:agentId", authenticate, getAgentMetrics);
router.put("/:id", authenticate, updateProperty);
router.post("/:id/save", authenticate, toggleSaveProperty);
router.post("/:id/video-view", authenticate, incrementVideoView);
router.get("/", authenticate, searchProperty);
router.get("/recommendations", authenticate, getRecommendations);
router.delete("/:id", authenticate, deleteProperty);

module.exports = router;
