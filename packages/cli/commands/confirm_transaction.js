import { getConfirmTransaction } from "@archethicjs/multisig-sdk";
import { getWalletConnection, prompt, secretPrompt } from "../utils.js";
import Archethic, { Crypto, Utils } from "@archethicjs/sdk";

export default {
  command: "confirm-transaction",
  describe: "Confirm a transaction to the multisig",
  builder: {},
  handler: confirmTransaction,
};

async function confirmTransaction() {
  try {
    const connectionType = await prompt(
      "Select connection type (1: Wallet, 2: Direct): ",
      (input) => {
        if (input !== "1" && input !== "2") {
          throw new Error("Invalid selection. Please choose 1 or 2");
        }
        return input;
      }
    );

    let archethic
    if (connectionType == "2") {
      console.log("Direct connection selected.");
      const connectionEndpoint = await prompt(
        "Enter network endpoint: ",
        (input) => {
          return input;
        }
      );
      archethic = new Archethic(connectionEndpoint)
      await archethic.connect()
    }
    else {
      console.log("Wallet connection selected.");
      archethic = await getWalletConnection();
    }

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
    
      const transactionAddress = await sendConfirmation(archethic, tx)
      console.log(`Transaction confirmed: ${transactionAddress}`);
    
      process.exit(0);
  }
  catch(e) {
    console.error(e);
    process.exit(1);
  }
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
    "getTransactionDetails",
    { transactionId },
  );

  if (status == "not exists") {
    throw new Error("Transaction ID not exists");
  }

  if (status == "done") {
    throw new Error("Transaction already executed")
  }
}

async function sendConfirmation(archethic, tx) {
  if (archethic.rpcWallet !== undefined) {
    const { transactionAddress } = await archethic.rpcWallet.sendTransaction(tx);
    return transactionAddress
  } else {
    const seed = await secretPrompt("Enter the seed of the current account: ", (input) => input)  
    const currentAddress = Crypto.deriveAddress(seed)
    const lastIndex = await archethic.transaction.getTransactionIndex(currentAddress)

    return new Promise((resolve, reject) => {
      tx
      .build(seed, lastIndex)
      .originSign(Utils.originPrivateKey)
      .on("fullConfirmation", () => {
        console.log(`Transaction confirmed`);
        resolve(Utils.uint8ArrayToHex(tx.address))
      })
      .on("sent", () => {
        console.log(`Transaction ${Utils.uint8ArrayToHex(tx.address)} sent`);
      })
      .on("error", (error, reason) => {
        reject(`Error: ${error} (${JSON.stringify(reason)})`)
      })
      .send()
    })
  }
}