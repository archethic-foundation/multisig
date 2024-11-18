import Archethic from "@archethicjs/sdk";
import { createInterface } from "readline";

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function getWalletConnection() {
  const archethic = new Archethic();
  archethic.rpcWallet.setOrigin({ name: "Archethic Multisig CLI" });
  await archethic.connect();

  return archethic;
}

export async function prompt(question, callback) {
  return new Promise((resolve, reject) => {
    readline.question(question, (input) => {
      try {
        resolve(callback(input));
      } catch (e) {
        reject(e);
      }
    });
  });
}

export function sendTransactionAsync(tx) {
  return new Promise((resolve, reject) => {
    tx.on("requiredConfirmation", (nbConf) => {
      resolve(nbConf);
    })
      .on("error", (context, reason) => {
        reject("Error: " + reason);
      })
      .on("timeout", () => {
        reject("Timeout");
      })
      .send();
  });
}
