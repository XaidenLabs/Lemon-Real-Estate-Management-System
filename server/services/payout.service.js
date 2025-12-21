const Payout = require("../models/payout.model");
const axios = require("axios");
const User = require("../models/user.model");
const Transaction = require("../models/transaction.model");
const escrowService = require("./escrow.service");

async function listBanks() {
  // Provider may provide bank listing; fallback to empty array for now
  return [];
}

async function createTransferRecipient({
  name,
  account_number,
  bank_code,
  currency = "NGN",
}) {
  // If no payout provider is configured, create a local/manual recipient placeholder so
  // the rest of the code can continue to work. If you later add a provider,
  // replace this implementation to call that provider's recipient API.
  if (!account_number)
    throw new Error("account_number is required to create recipient");

  const recipientId = `manual_${Date.now()}_${String(account_number).slice(-4)}`;
  return {
    data: {
      id: recipientId,
      recipient_id: recipientId,
      recipient_code: recipientId,
    },
  };
}

async function initiateTransfer({ amountMinor, recipient, reason = "Payout" }) {
  // No external payout provider configured. We queue the payout for manual processing
  // and return a placeholder transfer object. If you integrate with a provider,
  // implement the provider call here and return its result.
  return {
    data: {
      reference: `manual-transfer-${Date.now()}`,
      status: "queued",
      recipient,
    },
  };
}

/**
 * Disburse a payout record: ensures recipient exists on the configured payout provider (or falls back to manual queue) and initiates transfer.
 * Accepts payoutId or a payout document.
 */
async function disbursePayout(payoutOrId) {
  let payout = null;
  if (typeof payoutOrId === "string" || payoutOrId instanceof String) {
    payout = await Payout.findById(payoutOrId);
  } else payout = payoutOrId;

  if (!payout) throw new Error("Payout not found");

  if (payout.status === "disbursed") return payout; // idempotent

  // fetch owner
  const owner = await User.findById(payout.ownerId);
  if (!owner) {
    payout.status = "failed";
    payout.failureReason = "Owner not found";
    await payout.save();
    throw new Error("Owner not found for payout");
  }

  // ensure recipient exists (provider-agnostic). Prefer stored `payoutRecipientId`.
  let recipientCode = owner.payoutRecipientId || owner.paystackRecipientCode;
  if (!recipientCode) {
    if (!owner.bankAccountNumber || !owner.bankCode || !owner.bankAccountName) {
      payout.status = "failed";
      payout.failureReason = "Missing owner bank details";
      await payout.save();
      throw new Error("Owner missing bank details");
    }

    const recipient = await createTransferRecipient({
      name: owner.bankAccountName,
      account_number: owner.bankAccountNumber,
      bank_code: owner.bankCode,
    });

    // store recipient id returned by provider (adapt field name)
    recipientCode =
      (recipient &&
        (recipient.data?.id ||
          recipient.recipient_id ||
          recipient.recipient_code)) ||
      null;
    if (recipientCode) {
      owner.payoutRecipientId = recipientCode;
      await owner.save();
    }
  }

  // initiate transfer
  try {
    payout.status = "processing";
    await payout.save();

    // If the original payment was processed via the escrow provider, try to request a release
    // from the escrow (this moves funds to the seller/owner). Otherwise, fallback to queued/manual.
    const tx = await Transaction.findById(payout.transactionId).lean();
    if (tx && (tx.providerTransactionId || tx.paymentReference)) {
      const providerId = tx.providerTransactionId || tx.paymentReference;
      try {
        const amountMinor =
          payout.netAmountMinor || Math.round(Number(payout.netAmount) * 100);
        const releasePayload = {
          amountMinor,
          currency: payout.currency || tx.currency || "NGN",
          metadata: {
            payoutId: String(payout._id),
            transactionId: String(tx._id),
          },
        };

        const releaseRes = await escrowService.requestRelease(
          providerId,
          releasePayload
        );

        // map provider response to payout
        const providerRef =
          (releaseRes &&
            (releaseRes.data?.reference ||
              releaseRes.reference ||
              releaseRes.id)) ||
          null;
        payout.providerReference = providerRef;
        payout.status = "disbursed";
        payout.disbursedAt = new Date();
        await payout.save();

        return { payout, transfer: releaseRes };
      } catch (err) {
        // if release failed, mark as queued for manual processing and record failure
        payout.status = "queued";
        payout.failureReason = err?.message || String(err);
        await payout.save();
        return { payout, transfer: { error: payout.failureReason } };
      }
    }

    // No escrow/provider id available: queue for manual processing (bank transfer by admin)
    const transfer = await initiateTransfer({
      amountMinor: payout.netAmountMinor || payout.netAmount * 100,
      recipient: recipientCode,
      reason: `Payout for transaction ${payout.transactionId}`,
    });

    // mark the payout as queued for manual disbursement.
    payout.providerReference =
      (transfer &&
        (transfer.data?.reference || transfer.reference || transfer.id)) ||
      null;
    payout.status = "queued";
    await payout.save();

    return { payout, transfer };
  } catch (err) {
    payout.status = "failed";
    payout.failureReason = err.message || String(err);
    await payout.save();
    throw err;
  }
}

async function resolveAccount({ account_number, bank_code }) {
  try {
    const response = await axios.get(
      `https://api.paystack.co/bank/resolve?account_number=${account_number}&bank_code=${bank_code}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Could not resolve account details"
    );
  }
}

module.exports = {
  listBanks,
  createTransferRecipient,
  initiateTransfer,
  initiateTransfer,
  disbursePayout,
  resolveAccount,
};
