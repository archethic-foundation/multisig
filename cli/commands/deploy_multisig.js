import { Crypto, Utils } from "@archethicjs/sdk";
import crypto from "crypto";

import {
  getWalletConnection,
  prompt,
  sendTransactionAsync,
} from "../utils.js";
import { getDeployTransaction } from "@archethicjs/ae-multisig";

export default {
  command: "deploy",
  describe: "Deploy a multisig smart contract",
  builder: {},
  handler: deploy,
};

async function deploy() {
  const archethic = await getWalletConnection();

  const seedSC = crypto.randomBytes(32);
  const multiSigGenesis = Crypto.deriveAddress(seedSC);

  await fundSC(archethic, multiSigGenesis);

  const { genesisAddress: currentAddress } =
    await archethic.rpcWallet.getCurrentAccount();

  const multisigTx = await createContractTransaction(
    archethic,
    currentAddress,
    seedSC,
  );

  await sendTransactionAsync(multisigTx);
  console.log(`Multisig address: ${Utils.uint8ArrayToHex(multiSigGenesis)}`);

  process.exit(0);
}

async function fundSC(archethic, multiSigGenesis) {
  const transferTx = archethic.transaction
    .new()
    .setType("transfer")
    .addUCOTransfer(multiSigGenesis, Utils.toBigInt(1));

  console.log("Sending 1 UCO to fund mulitisig chain...");
  await archethic.rpcWallet.sendTransaction(transferTx);
}

async function createContractTransaction(archethic, currentAddress, seedSC) {
  const { secret, authorizedKeys } = await getSCOwnnership(archethic, seedSC);

  const tx = getDeployTransaction(archethic, { voters: await promptInitialVoters(currentAddress)}, secret, authorizedKeys)
  return tx
    .build(seedSC, 0)
    .originSign(Utils.originPrivateKey);
}

async function promptInitialVoters(defaultAddress) {
  return await prompt(
    `Enter the address of the initial voters (use ',' as separator) [default: ${defaultAddress}]: `,
    (input) => {
      if (input == "") {
        return [defaultAddress];
      }
      const voters = input.split(",").map((x) => x.trim());

      voters.forEach((x) => {
        if (!Utils.isHex(x)) {
          throw new Error("Voter's address must be hexadecimal");
        }
      });

      return voters;
    },
  );
}

async function getSCOwnnership(archethic, seed) {
  const aesKey = Crypto.randomSecretKey();
  const storageNoncePublicKey =
    await archethic.network.getStorageNoncePublicKey();

  return {
    secret: Crypto.aesEncrypt(seed, aesKey),
    authorizedKeys: [
      {
        publicKey: storageNoncePublicKey,
        encryptedSecretKey: Crypto.ecEncrypt(aesKey, storageNoncePublicKey),
      },
    ],
  };
}
