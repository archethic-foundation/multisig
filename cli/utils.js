import Archethic from "@archethicjs/sdk";
import { createInterface } from "readline";
import path from "path";
import { dirname } from "path";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

export async function getWalletConnection() {
  const archethic = new Archethic("ws://127.0.0.1:12345");
  archethic.rpcWallet.setOrigin({ name: "Archethic Multisig CLI" });
  await archethic.connect();

  return archethic;
}

export async function prompt(question, callback) {
  return new Promise((r) => {
    readline.question(question, (input) => {
      r(callback(input));
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

export function getContractCode() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const contractSourceFile = path.resolve(__dirname, "./contract.aesc");
  return readFileSync(contractSourceFile, "utf8");
}
