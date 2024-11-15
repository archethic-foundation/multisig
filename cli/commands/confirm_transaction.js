import { getConfirmTransaction } from "@archethicjs/ae-multisig";
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

  const chainSizeResponse = await archethic.network.rawGraphQLQuery(`
  query{
    lastTransaction(address: "${multiSig}") {
      chainLength
    }
  }
  `);

  if (
    chainSizeResponse == null ||
    (chainSizeResponse.lastTransaction &&
      chainSizeResponse.lastTransaction.chainLength == 0)
  ) {
    throw new Error("Multisig doesn't exists");
  }

  const transactionId = await promptTransactionId();

  await assertTransactionId(archethic, multiSig, transactionId);

  const tx = getConfirmTransaction(archethic , multiSig, transactionId)

  const { transactionAddress } = await archethic.rpcWallet.sendTransaction(tx);
  console.log(`Transaction confirmed: ${transactionAddress}`);

  process.exit(0);
}

async function promptMultiSig() {
  return await prompt("Enter the address of the multisig: ", (input) => {
    if (input == "") {
      throw new Error("Invalid multisig address");
    }
    return input;
  });
}

async function promptTransactionId() {
  return await prompt("Enter the transaction id to confirm: ", (input) => {
    const id = Number(input);
    if (id == NaN || id <= 0) {
      throw new Error("Invalid transaction ID");
    }
    return id;
  });
}

async function assertTransactionId(archethic, multiSig, transactionId) {
  const { status } = await archethic.network.callFunction(
    multiSig,
    "transaction_status",
    [transactionId],
  );

  if (status == "not exists") {
    throw new Error("Transaction ID not exists");
  }
}
