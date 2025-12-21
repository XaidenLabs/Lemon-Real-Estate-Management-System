const Transaction = require("../models/transaction.model");
const Property = require("../models/property.model");
const Payout = require("../models/payout.model");
const User = require("../models/user.model");
const Notification = require("../models/notification.model");
const Chat = require("../models/chat.model");
const payoutService = require("../services/payout.service");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const axios = require("axios");
const emailService = require("../services/email.service");
const escrowService = require("../services/escrow.service");
const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
const FRONTEND_CALLBACK_SUCCESS_URL =
  process.env.FRONTEND_CALLBACK_SUCCESS_URL ||
  `${APP_BASE_URL}/payment/success`;

// emailService (SMTP / Gmail) is used for sending emails

// helper: generate numeric OTP
const generateNumericCode = (length = 6) => {
  let code = "";
  for (let i = 0; i < length; i++)
    code += Math.floor(Math.random() * 10).toString();
  console.log({ code });
  return code;
};

// POST /transactions/generate-code
// body: { propertyId, userId }
const generateCode = async (req, res) => {
  const { propertyId, userId } = req.body;
  if (!propertyId || !userId)
    return res
      .status(400)
      .json({ success: false, message: "propertyId and userId required" });

  try {
    const property = await Property.findById(propertyId).lean();
    const buyer = await User.findById(userId).select(
      "email firstName lastName",
    );
    if (!property || !buyer)
      return res
        .status(404)
        .json({ success: false, message: "Property or buyer not found" });

    // create draft transaction
    const code = generateNumericCode(6);
    const salt = await bcrypt.genSalt(10);
    const codeHash = await bcrypt.hash(code, salt);
    const expiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    const draftSnapshot = {
      title: property.title,
      ownerName: `${property.agentName || "Owner"}`,
      category: property.category || property.type || "Property",
      description: property.description || "",
      location: property.country || property.location || "",
      amount: property.price || 0,
      currency: property.currency || "NGN",
      photo:
        property.images && property.images.length > 0
          ? property.images[0]
          : null,
      ownerContact: property.agentContact || property.ownerContact || "",
      propertyStatus: property.status || "Sale",
    };

    const tx = await Transaction.create({
      propertyId,
      buyerId: userId,
      ownerId: property.agentId || property.ownerId,
      amount: property.price || 0,
      currency: property.currency || "NGN",
      draftSnapshot,
      codeHash,
      codeExpiry: expiry,
      status: "code_sent",
    });

    // send email to buyer (non-blocking)
    (async () => {
      try {
        if (buyer && buyer.email) {
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: buyer.email,
            subject: `Your LemonZee payment code`,
            html: `<p>Hi ${buyer.firstName || ""},</p><p>Your verification code is <strong>${code}</strong>. It expires in 15 minutes.</p>`,
          };
          await emailService.sendMail(mailOptions);
        }
      } catch (err) {
        console.log({ err });
        console.error("Error sending OTP email:", err?.message || err);
      }
    })();

    return res
      .status(200)
      .json({
        success: true,
        message: "Code sent to registered email",
        transactionId: tx._id,
      });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Error generating code",
        error: err.message,
      });
  }
};

// POST /transactions/verify-code
// body: { transactionId, code }
const verifyCode = async (req, res) => {
  const { transactionId, code } = req.body;
  if (!transactionId || !code)
    return res
      .status(400)
      .json({ success: false, message: "transactionId and code required" });

  try {
    const tx = await Transaction.findById(transactionId);
    if (!tx)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    if (tx.codeExpiry < new Date())
      return res.status(400).json({ success: false, message: "Code expired" });

    const valid = await bcrypt.compare(code, tx.codeHash);
    if (!valid)
      return res.status(400).json({ success: false, message: "Invalid code" });

    tx.status = "verified";
    await tx.save();

    // return draftSnapshot so frontend can show property details
    return res
      .status(200)
      .json({ success: true, message: "Code verified", transaction: tx });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Error verifying code",
        error: err.message,
      });
  }
};

// POST /transactions/initiate
// body: { transactionId, buyerEmail }
// Response: { checkoutUrl, transactionId }
const initiatePayment = async (req, res) => {
  const { transactionId, buyerEmail, currency: requestedCurrency } = req.body;
  if (!transactionId)
    return res
      .status(400)
      .json({ success: false, message: "transactionId required" });

  try {
    const tx = await Transaction.findById(transactionId);
    if (!tx)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });
    if (tx.status !== "verified" && tx.status !== "initiated") {
      return res
        .status(400)
        .json({ success: false, message: "Transaction not ready for payment" });
    }

    // allow client to request a currency; persist selection on transaction
    const currency = requestedCurrency || tx.currency || "NGN";
    tx.currency = currency;

    // initialize an escrow transaction (Payluk) via escrow service
    try {
      const payload = {
        amount: tx.amount,
        currency,
        description: `Escrow for property ${tx.propertyId}`,
        buyer: {
          id: tx.buyerId ? String(tx.buyerId) : undefined,
          email: buyerEmail,
        },
        seller: {
          id: tx.ownerId ? String(tx.ownerId) : undefined,
        },
        return_url: FRONTEND_CALLBACK_SUCCESS_URL,
        cancel_url: process.env.FRONTEND_CALLBACK_CANCEL_URL || `${APP_BASE_URL}/payment/cancel`,
        metadata: {
          transactionId: tx._id.toString(),
          propertyId: tx.propertyId.toString(),
          buyerId: tx.buyerId.toString(),
          ownerId: tx.ownerId.toString(),
        },
      };

      const providerResp = await escrowService.createTransaction(payload);
      const providerData = providerResp && providerResp.data ? providerResp.data : providerResp;

      const checkoutUrl = providerData && (providerData.process_url || providerData.checkout_url || providerData.url || providerData.redirect_url);
      const providerTxId = providerData && (providerData.id || providerData.transactionId || providerData.reference || providerData.paymentToken);

      tx.providerTransactionId = providerTxId || tx.providerTransactionId;
      tx.checkoutAuthorizationUrl = checkoutUrl || tx.checkoutAuthorizationUrl || null;
      tx.status = "initiated_payment";
      await tx.save();

      return res.status(200).json({ success: true, checkoutUrl, transactionId: tx._id, providerResp });
    } catch (err) {
      console.error(
        "initiatePayment (escrow) error:",
        err?.response?.data || err.message || err,
      );
      return res
        .status(500)
        .json({
          success: false,
          message: "Error initiating escrow payment",
          error: err?.response?.data || err.message || err,
        });
    }
  } catch (err) {
    console.error(
      "initiatePayment error:",
      err?.response?.data || err.message || err,
    );
    return res
      .status(500)
      .json({
        success: false,
        message: "Error initiating payment",
        error: err.message,
      });
  }
};

const linkPaymentToTransaction = async (req, res) => {
  try {
    const { transactionId, paymentReference } = req.body;
    if (!transactionId || !paymentReference)
      return res
        .status(400)
        .json({
          success: false,
          message: "transactionId and paymentReference required",
        });

    const tx = await Transaction.findById(transactionId);
    if (!tx)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });

    tx.paymentReference = paymentReference;
    tx.status = "pending_confirmation";
    await tx.save();

    // Notify owner & buyer (reuse your Notification logic)
    // ... create Notification + create Chat bot message to owner etc.

    return res.status(200).json({ success: true, transaction: tx });
  } catch (err) {
    console.error("linkPaymentToTransaction error:", err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /transactions/charge
// body: { transactionId, authorization_code, buyerEmail }
const chargeWithAuthorization = async (req, res) => {
  const { transactionId, authorization_code, buyerEmail } = req.body;
  if (!transactionId || !authorization_code)
    return res.status(400).json({ success: false, message: "transactionId and authorization_code required" });

  try {
    const tx = await Transaction.findById(transactionId);
    if (!tx) return res.status(404).json({ success: false, message: "Transaction not found" });

    if (tx.status !== "verified" && tx.status !== "initiated" && tx.status !== "initiated_payment") {
      return res.status(400).json({ success: false, message: "Transaction not ready for charge" });
    }

    const amountMinor = Math.round(tx.amount * 100);
    // Use Paystack charge_authorization endpoint to charge saved authorization codes.
    try {
      const resp = await fetch("https://api.paystack.co/transaction/charge_authorization", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ authorization_code, email: buyerEmail, amount: amountMinor }),
      });

      const data = await resp.json();
      const success = data && (data.status === true || data.status === "success" || data.data?.status === "success");

      if (!success) {
        return res.status(500).json({ success: false, message: "Error charging authorization with Paystack", details: data });
      }

      tx.status = "pending_confirmation";
      tx.paymentReference = data.data?.reference || data.reference || data.data?.id || null;
      await tx.save();
    } catch (err) {
      console.error("chargeWithAuthorization (paystack) error:", err);
      return res.status(500).json({ success: false, message: "Error charging authorization", error: err?.message || err });
    }

    await Notification.create({ userId: tx.ownerId, type: "payment_pending", title: "Payment received (pending confirmation)", body: `A payment for ${tx.draftSnapshot.title} has been made and awaits your confirmation.`, data: { transactionId: tx._id } });

    await Chat.create({ senderId: tx.buyerId, receiverId: tx.ownerId, message: `Payment made for ${tx.draftSnapshot.title}. Please confirm the transaction.` });

    (async () => {
      try {
        const owner = await User.findById(tx.ownerId).select("email firstName");
        if (owner && owner.email) {
          await emailService.sendMail({ from: process.env.EMAIL_FROM || process.env.EMAIL_USER, to: owner.email, subject: `Payment pending confirmation for ${tx.draftSnapshot.title}`, html: `<p>Hi ${owner.firstName || ""},</p><p>A buyer has made payment for <strong>${tx.draftSnapshot.title}</strong>. Please confirm the transaction in the app to complete transfer.</p>` });
        }
      } catch (err) {
        console.error("Error sending owner email on pending payment (charge):", err);
      }
    })();

    (async () => {
      try {
        let payout = await Payout.findOne({ transactionId: tx._id });
        if (!payout) {
          const commissionRate = 0.04;
          const commission = Math.round(tx.amount * commissionRate * 100) / 100;
          const toOwner = Math.round((tx.amount - commission) * 100) / 100;

          payout = await Payout.create({ transactionId: tx._id, ownerId: tx.ownerId, buyerId: tx.buyerId, amount: tx.amount, amountMinor: Math.round(Number(tx.amount) * 100), commission, netAmount: toOwner, netAmountMinor: Math.round(Number(toOwner) * 100), currency: tx.currency || "NGN", status: "queued", method: "bank_transfer", metadata: { propertyId: tx.propertyId, propertyTitle: tx.draftSnapshot?.title } });
          tx.payoutId = payout._id;
          await tx.save();
        }

        try {
          await payoutService.disbursePayout(payout._id);
        } catch (err) {
          console.warn("Immediate disbursement failed (will remain queued):", err?.message || err);
        }
      } catch (err) {
        console.error("Charge: payout creation error:", err?.message || err);
      }
    })();

    return res.status(200).json({ success: true, transaction: tx, paymentReference: tx.paymentReference });
  } catch (err) {
    console.error("chargeWithAuthorization error:", err?.response?.data || err.message || err);
    return res.status(500).json({ success: false, message: "Error charging authorization", error: err?.response?.data || err.message || err });
  }
};

/**
 * GET /api/transaction/latest-for-user?propertyId=...&userId=...
 * Returns the latest transaction for a given user + property (buyer or owner).
 * Useful for chat screens that poll a user's latest transaction for a property.
 */
const getLatestForUser = async (req, res) => {
  try {
    const { propertyId, userId } = req.query;

    if (!propertyId || !userId) {
      return res
        .status(400)
        .json({
          success: false,
          message: "propertyId and userId query params required",
        });
    }

    // Find the most recent transaction for that property where user is buyer or owner
    const tx = await Transaction.findOne({
      propertyId,
      $or: [{ buyerId: userId }, { ownerId: userId }],
    })
      .sort({ createdAt: -1 })
      .lean()
      .populate([
        {
          path: "buyerId",
          select: "firstName lastName email phone profilePicture",
        },
        {
          path: "ownerId",
          select: "firstName lastName email phone profilePicture",
        },
      ]);

    if (!tx) return res.status(200).json({ success: true, transaction: null });

    // attach payout snapshot if exists
    if (tx.payoutId) {
      try {
        const payout = await Payout.findById(tx.payoutId).lean();
        if (payout) {
          tx.payoutSnapshot = {
            _id: payout._id,
            status: payout.status,
            netAmount: payout.netAmount,
            currency: payout.currency,
            scheduledAt: payout.scheduledAt,
            providerReference: payout.providerReference,
          };
        }
      } catch (err) {
        console.warn(
          "getLatestForUser: payout lookup failed",
          err?.message || err,
        );
      }
    }

    return res.status(200).json({ success: true, transaction: tx });
  } catch (err) {
    console.error("getLatestForUser error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Error fetching latest transaction",
        error: err.message,
      });
  }
};

/**
 * Helper: create in-app notification and optionally send email (best-effort)
 */
async function notifyUser({
  userId,
  title,
  body,
  data = {},
  sendEmail = false,
}) {
  try {
    await Notification.create({
      userId,
      type: data?.type || "system",
      title,
      body,
      data,
    });
  } catch (err) {
    console.warn(
      "notifyUser: notification creation failed",
      err?.message || err,
    );
  }

  if (sendEmail && (process.env.EMAIL_FROM || process.env.EMAIL_USER || process.env.SMTP_HOST)) {
    try {
      const user = await User.findById(userId).select("email firstName");
      if (user && user.email) {
        await emailService.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: user.email,
          subject: title,
          html: `<p>Hi ${user.firstName || ""},</p><p>${body}</p>`,
        });
      }
    } catch (err) {
      console.warn("notifyUser: email sending failed", err?.message || err);
    }
  }
}

// POST /transactions/confirm
// body: { transactionId, role } role = 'buyer' | 'owner'
/**
 * confirmTransaction
 * - buyers confirm -> mark transaction awaiting_disbursement
 * - create Payout entry for admins to process
 * - notify buyer and owner
 */
const confirmTransaction = async (req, res) => {
  const { transactionId, role } = req.body;
  if (!transactionId || !role)
    return res
      .status(400)
      .json({ success: false, message: "transactionId and role required" });

  try {
    const tx = await Transaction.findById(transactionId);
    if (!tx)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });

    // set confirmations
    if (role === "buyer") {
      tx.confirmations = tx.confirmations || {};
      tx.confirmations.buyer = true;
    }

    // Only buyer confirmation triggers payout queue in your new flow
    if (role === "buyer") {
      // mark transaction awaiting admin disbursement
      tx.status = "awaiting_disbursement";

      // calculate commission 4%
      const commissionRate = 0.04;
      const commission = Math.round(tx.amount * commissionRate * 100) / 100; // 2dp
      const toOwner = Math.round((tx.amount - commission) * 100) / 100;

      // mark property taken now (you can choose to wait until disbursement completes)
      await Property.findByIdAndUpdate(tx.propertyId, { isTaken: true });

      // create a Payout record for admin queue (avoid duplicates)
      const owner = await User.findById(tx.ownerId).lean();
      const buyer = await User.findById(tx.buyerId).lean();

      let payout = await Payout.findOne({ transactionId: tx._id });
      if (!payout) {
        payout = await Payout.create({
          transactionId: tx._id,
          ownerId: tx.ownerId,
          buyerId: tx.buyerId,
          amount: tx.amount,
          amountMinor: Math.round(Number(tx.amount) * 100),
          commission,
          netAmount: toOwner,
          netAmountMinor: Math.round(Number(toOwner) * 100),
          currency: tx.currency || "NGN",
          status: "awaiting_disbursement",
          method: "bank_transfer",
          metadata: {
            propertyId: tx.propertyId,
            propertyTitle: tx.draftSnapshot?.title,
          },
        });
      }

      // create in-app notifications (buyer & owner)
      await notifyUser({
        userId: tx.buyerId,
        title: "Payment recorded — awaiting disbursement",
        body: `Your payment of ${tx.currency || "NGN"} ${tx.amount} for "${tx.draftSnapshot?.title}" has been received and is awaiting admin disbursement.`,
        data: {
          transactionId: tx._id,
          payoutId: payout._id,
          type: "transaction_awaiting_disbursement",
        },
        sendEmail: true,
      });

      await notifyUser({
        userId: tx.ownerId,
        title: "Payout queued",
        body: `A payout for your property "${tx.draftSnapshot?.title}" has been queued. Net amount: ${tx.currency || "NGN"} ${toOwner}. Admin will disburse soon.`,
        data: {
          transactionId: tx._id,
          payoutId: payout._id,
          type: "payout_queued",
        },
        sendEmail: true,
      });

      try {
        await emailService.sendMail({
          from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          to: process.env.EMAIL_USER,
          subject: "Payout queued (action required)",
          html: `<p>Payout queued for ${owner?.firstName || ""} ${owner?.lastName || ""} — ${tx.currency || "NGN"} ${toOwner}. Transaction: ${tx._id}</p>`,
        });
      } catch (e) {
        console.warn("Admin notification email failed", e?.message || e);
      }
    }

    await tx.save();

    return res.status(200).json({ success: true, transaction: tx });
  } catch (err) {
    console.error("confirmTransaction error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Error confirming transaction",
        error: err.message,
      });
  }
};

/**
 * GET /api/transaction/:id
 * Returns a single transaction by id, populated with buyer/owner and basic payout info (if any).
 */
const getTransaction = async (req, res) => {
  try {
    const id = req.params.id;
    if (!id)
      return res
        .status(400)
        .json({ success: false, message: "transaction id required" });

    const tx = await Transaction.findById(id)
      .lean()
      .populate("buyerId ownerId propertyId");

    if (!tx)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });

    // if there is a payoutId or payout stored, attach a snapshot (non-sensitive)
    if (tx.payoutId) {
      try {
        const payout = await Payout.findById(tx.payoutId).lean();
        if (payout) {
          tx.payoutSnapshot = {
            _id: payout._id,
            status: payout.status,
            netAmount: payout.netAmount,
            currency: payout.currency,
            scheduledAt: payout.scheduledAt,
            disbursedAt: payout.disbursedAt,
            providerReference: payout.providerReference,
          };
        }
      } catch (err) {
        // don't fail the whole request for payout lookup errors
        console.warn(
          "getTransaction: payout lookup failed",
          err?.message || err,
        );
      }
    }

    // Return transaction (lean object)
    return res.status(200).json({ success: true, transaction: tx });
  } catch (err) {
    console.error("getTransaction error:", err);
    return res
      .status(500)
      .json({
        success: false,
        message: "Error fetching transaction",
        error: err.message,
      });
  }
};

module.exports = {
  generateCode,
  verifyCode,
  initiatePayment,
  confirmTransaction,
  linkPaymentToTransaction,
  getLatestForUser,
  getTransaction,
};
