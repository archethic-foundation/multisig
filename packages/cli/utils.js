import Archethic from "@archethicjs/sdk";
import { createInterface } from "readline";

export async function getWalletConnection() {
  const archethic = new Archethic();
  archethic.rpcWallet.setOrigin({ name: "Archethic Multisig CLI" });
  await archethic.connect();

  return archethic;
}

export async function prompt(question, callback) {
  return new Promise((resolve, reject) => {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    readline.question(question, (input) => {
      try {
        resolve(callback(input));
        readline.close();
      } catch (e) {
        reject(e);
      }
    });
  });
}

export async function secretPrompt(question, callback) {
  return new Promise((resolve, reject) => {
    const readline = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    readline.stdoutMuted = true;
    readline.question(question, (input) => {
      try {
        resolve(callback(input));
      } catch (e) {
        reject(e);
      }

      readline.close()
      console.log("\n")
    });
    readline._writeToOutput = function _writeToOutput(stringToWrite) {
      if (readline.stdoutMuted) {
        readline.output.write("*");
      } 
      else {
        readline.output.write(stringToWrite);
      }
    };
  });
}

export function sendTransactionAsync(tx) {
  return new Promise((resolve, reject) => {
    tx.on("requiredConfirmation", (nbConf) => {
      resolve(nbConf);
    })
      .on("error", (error, reason) => {
        reject(`Error: ${error} (${JSON.stringify(reason)})`);
        
      })
      .on("timeout", () => {
        reject("Timeout");
      })
      .send(70);
  });
}
