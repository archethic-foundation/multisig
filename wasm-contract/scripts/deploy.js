import {createInterface } from "readline"

import { getConnection, getRandomAccount, getAccount, getDeployContractTx } from "@archethicjs/ae-contract-test"

import { Utils } from "@archethicjs/sdk"

const readline = createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function main() {
  const archethic = await getConnection(process.env["ENDPOINT"] || "https://mainnet.archethic.net")
  if (process.env["SEED"] === undefined) {
    throw new Error("SEED env var is required")
  }
  const fundingAccount = await getAccount(archethic, process.env["SEED"])
  await fundingAccount.requestFaucet()

  const contractAccount = getRandomAccount(archethic)

  const fundingTx = archethic.transaction.new()
  .setType("transfer")
  .addUCOTransfer(contractAccount.address, Utils.parseBigInt("1"))

  console.log("Funding contract...")
  await fundingAccount.sendTransaction(fundingTx)

  console.log("Deploying contract...")
  const contractTx = await getDeployContractTx(contractAccount, {
    content: JSON.stringify({
      voters: [{hex: "0000627002d7d8b4d980fd77542c109ba06f4a2c53b23c26fc1b6a2cc389f66996d9"}]
    })
  })
  const { transactionAddress } = await contractAccount.sendTransaction(contractTx)

  console.log(`Contract deployed at: ${transactionAddress}`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error);
  process.exit(1)
});

