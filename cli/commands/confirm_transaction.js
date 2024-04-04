import { getWalletConnection, prompt } from "../utils.js";

export default {
  command: "confirm-transaction",
  describe: "Confirm a transaction to the multisig",
  builder: {},
  handler: confirmTransaction,
};

async function confirmTransaction() {
  const archethic = await getWalletConnection();

  const multiSig = await promptMultiSig();
  const transactionId = await promptTransactionId();

  const tx = archethic.transaction
    .new()
    .setType("transfer")
    .addRecipient(multiSig, "confirm_transaction", [transactionId]);

  const { transactionAddress } = await archethic.rpcWallet.sendTransaction(tx);
  console.log(`Transaction confirmed: ${transactionAddress}`);

  process.exit(0);
}

async function promptMultiSig() {
  return await prompt("Enter the address of the multisig: ", (input) => {
    if (input == "") {
      throw "Invalid multisig address";
    }
    return input;
  });
}

async function promptTransactionId() {
  return await prompt("Enter the transaction id to confirm: ", (input) => {
    const id = Number(input);
    if (id == NaN || id <= 0) {
      throw "Invalid transaction ID";
    }
    return input;
  });
}
