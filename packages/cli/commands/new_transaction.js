import { Utils } from "@archethicjs/sdk";
import { readFileSync, existsSync } from "fs";
import { getWalletConnection, prompt } from "../utils.js";
import { getProposeTransaction } from "@archethicjs/multisig-sdk";

export default {
  command: "new-transaction",
  describe: "Propose a new transaction to the multisig",
  builder: {},
  handler: newTransaction,
};

async function newTransaction() {
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

  const mapChoices = {
    1: ucoTransferPrompt,
    2: tokenTransferPrompt,
    3: recipientPrompt,
    4: codePrompt,
    5: contentPrompt,
    6: voterPrompt,
    7: confirmationThresholdPrompt,
  };

  const new_tx = await choice(mapChoices, {
    txData: {
      ucoTransfers: [],
      tokenTransfers: [],
      code: "",
      recipients: [],
    },
    setup: {},
  });

  console.log("Transaction to sent");

  console.log(JSON.stringify(new_tx, null, 2));

  const tx = getProposeTransaction(archethic, multiSig, new_tx.txData, new_tx.setup)

  const { transactionAddress } = await archethic.rpcWallet.sendTransaction(tx);
  console.log(`Transaction confirmed: ${transactionAddress}`);

  process.exit(0);
}

async function promptMultiSig() {
  return await prompt("Enter the address of the multisig: ", (input) => {
    if (input == "") {
      throw new Error("Invalid multisig address");
    }

    if (!Utils.isHex(input)) {
      throw new Error("Multisig's address must be hexadecimal");
    }

    return input;
  });
}

async function choice(mapChoices, tx) {
  const selection = Object.keys(mapChoices).length + 1;

  const menu = `

-------------------------------------
    Multisig transaction builder
-------------------------------------
- 1: Add UCO transfer
- 2: Add token transfer
- 3: Add smart contract call
- 4: Propose new code
- 5: Propose new content
- 6: Add new voters
- 7: Set new confirmation threshold
- ${selection}: Send the transaction
-------------------------------------
> `;

  return await prompt(menu, async (input) => {
    if (input != selection) {
      if (!Object.keys(mapChoices).includes(input)) {
        return r(choice(mapChoices, tx));
      }
      tx = await mapChoices[input](tx);
      return choice(mapChoices, tx);
    }

    return tx;
  });
}

async function ucoTransferPrompt(tx) {
  const recipient = await prompt("Enter the recipient address: ", (input) => {
    if (!Utils.isHex(input)) {
      throw new Error("Recipient address must be hexadecimal");
    }
    return input;
  });

  const amount = await prompt("Enter the amount to transfer: ", (input) => {
    const amount = Number(input);
    if (amount == NaN || amount <= 0) {
      throw new Error("Invalid number");
    }
    return amount;
  });

  tx.txData.ucoTransfers.push({ to: recipient, amount: amount });
  return tx;
}

async function tokenTransferPrompt(tx) {
  const recipient = await prompt("Enter the recipient address: ", (input) => {
    if (!Utils.isHex(input)) {
      throw new Error("Recipient address must be hexadecimal");
    }
    return input;
  });

  const amount = await prompt("Enter the amount to transfer: ", (input) => {
    const amount = Number(input);
    if (amount == NaN || amount <= 0) {
      throw new Error("Invalid number");
    }
    return amount;
  });

  const token = await prompt("Enter the token to transfer: ", (input) => {
    if (!Utils.isHex(input)) {
      throw new Error("Token address must be hexadecimal");
    }
    return input;
  });

  tx.txData.tokenTransfers.push({
    to: recipient,
    amount: amount,
    tokenAddress: token,
  });
  return tx;
}

async function recipientPrompt(tx) {
  const recipient = await prompt("Enter the recipient address: ", (input) => {
    if (!Utils.isHex(input)) {
      throw new Error("Recipient address must be hexadecimal");
    }
    return input;
  });

  const action = await prompt("Enter the action's name: ", (input) => {
    if (input == "") {
      throw new Error("Action is required");
    }
    return input;
  });

  const args = await prompt(
    "Enter the parameters: (use ',' as separator)",
    (input) => {
      return input
        .split(",")
        .map((arg) => arg.trim())
        .map(parseTypedArgument);
    },
  );

  tx.txData.recipients.push({
    address: recipient,
    action: action,
    args: args,
  });
  return tx;
}

async function codePrompt(tx) {
  const codeFilePath = await prompt(
    "Enter filepath for code to propose:\n",
    (path) => {
      if (!existsSync(path)) {
        throw new Error("Source code filepath doesn't exists");
      }
      return path;
    },
  );

  const code = readFileSync(codeFilePath, "utf8");
  tx.txData.code = code;
  return tx;
}

async function contentPrompt(tx) {
  const content = await prompt(
    "Enter content to propose:\n",
    (content) => {
      return content;
    },
  );
  tx.txData.content = content;
  return tx;
}

async function voterPrompt(tx) {
  const voters = await prompt(
    "Enter the new voter addresses to autorize (use ',' as separator): ",
    (input) => {
      const voters = input.split(",").map((x) => x.trim());

      voters.forEach((x) => {
        if (!Utils.isHex(x)) {
          throw new Error("Voter's address must be hexadecimal");
        }
      });
      return voters;
    },
  );

  tx.setup.newVoters = voters;
  return tx;
}

async function confirmationThresholdPrompt(tx) {
  const confirmationThreshold = await prompt(
    "Enter the new confirmation threshold: ",
    (input) => {
      const number = Number(input);
      if (number == NaN || number <= 0) {
        throw new Error("Invalid number");
      }
      return number;
    },
  );

  tx.setup.confirmationThreshold = confirmationThreshold;
  return tx;
}

function parseTypedArgument(input) {
  // Check if input is an object
  if (typeof input === "object") {
    return input; // Return input as is
  } else if (!isNaN(input)) {
    // Check if input is a number
    return parseFloat(input); // Parse input as a float
  } else {
    return input; // Return input as string
  }
}
