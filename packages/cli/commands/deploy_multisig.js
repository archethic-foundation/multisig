import Archethic, { Crypto, Utils } from "@archethicjs/sdk";
import { Contract } from "@archethicjs/sdk/dist/contract.js";

import crypto from "crypto";

import {
  getWalletConnection,
  prompt,
  secretPrompt,
  sendTransactionAsync,
} from "../utils.js";
import { getDeployTransaction } from "@archethicjs/multisig-sdk";

import { readFileSync } from "fs";

export default {
  command: "deploy",
  describe: "Deploy a multisig smart contract",
  builder: {},
  handler: deploy,
};

async function deploy() {
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
  
    const seedSC = crypto.randomBytes(32);
    const multiSigGenesis = Crypto.deriveAddress(seedSC);
  
    const { currentAddress } = await fundSC(archethic, multiSigGenesis, connectionType);
  
    console.log(`Creating multisig contract at ${Utils.uint8ArrayToHex(multiSigGenesis)}`);
    const multisigTx = await createContractTransaction(
      archethic,
      Utils.uint8ArrayToHex(currentAddress),
      seedSC,
    );
  
    await sendTransactionAsync(multisigTx);
    console.log(`Multisig deployed!`);
    process.exit(0)
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

async function fundSC(archethic, multiSigGenesis, connectionType) {
  const transferTx = archethic.transaction
    .new()
    .setType("transfer")
    .addUCOTransfer(multiSigGenesis, Utils.parseBigInt('5'));

  console.log("Sending 1 UCO to fund mulitisig chain...");
  if (connectionType == "2") {
    return new Promise(async (resolve, reject) => {
      const seed = await secretPrompt("Enter the seed of the current account: ", (input) => input)  
      const currentAddress = Crypto.deriveAddress(seed)
      const lastIndex = await archethic.transaction.getTransactionIndex(Crypto.deriveAddress(seed))

      transferTx
        .build(seed, lastIndex)
        .originSign(Utils.originPrivateKey)
        .on("fullConfirmation", () => {
          console.log(`Transaction confirmed`);
          resolve({ 
            fundingAddress: Utils.uint8ArrayToHex(transferTx.address),
            currentAddress: currentAddress
          })
        })
        .on("sent", () => {
          console.log(`Transaction ${Utils.uint8ArrayToHex(transferTx.address)} sent`);
        })
        .on("error", (error, reason) => {
          reject(`Error: ${error} (${JSON.stringify(reason)})`)
        })
        .send()
    })
  } else {
    await archethic.rpcWallet.sendTransaction(transferTx);
    const { genesisAddress } =
        await archethic.rpcWallet.getCurrentAccount();
  
    const currentAddress = genesisAddress
    return { 
      fundingAddress: Utils.uint8ArrayToHex(transferTx.address),
      currentAddress: currentAddress
    }
  }
}

async function createContractTransaction(archethic, currentAddress, seedSC) {
  const bytecode = readFileSync("./contract.wasm")
  const manifest = readFileSync("./contract_manifest.json", "utf-8")
  const contract = new Contract(new Uint8Array(bytecode), JSON.parse(manifest))
  const tx = await getDeployTransaction(archethic, { voters: await promptInitialVoters(currentAddress)}, seedSC, contract)
  return tx
    .build(seedSC, 0)
    .originSign(Utils.originPrivateKey);
}

async function promptInitialVoters(defaultAddress) {
  return await prompt(
    `Enter the address of the initial voters (use ',' as separator) [default: ${defaultAddress}]: `,
    (input) => {
      if (input == "") {
        return [ { hex: defaultAddress }];
      }
      const voters = input.split(",").map((x) => { 
        return { hex: x.trim() }
      });

      voters.forEach((x) => {
        if (!Utils.isHex(x)) {
          throw new Error("Voter's address must be hexadecimal");
        }
      });

      return voters;
    },
  );
}