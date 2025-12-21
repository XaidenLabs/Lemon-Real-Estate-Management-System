const payoutService = require("../services/payout.service");

const getBanks = async (req, res) => {
  try {
    const data = await payoutService.listBanks();
    // return list to client (map to useful shape)
    const banks = (data && data.data) || (data && data.message) || data;
    return res.status(200).json({ success: true, banks });
  } catch (err) {
    console.error("getBanks error:", err?.message || err);
    return res.status(500).json({ success: false, message: "Could not fetch bank list" });
  }
};

module.exports = { getBanks };
