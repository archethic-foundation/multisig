import { getContext } from "@archethicjs/ae-contract-test"
import { Utils } from "@archethicjs/sdk"

async function main() {
  const ctx = await getContext()
  const fundingAccount = await ctx.getAccount()
  await fundingAccount.requestFaucet()

  const contractAccount = ctx.getRandomAccount()

  const fundingTx = ctx.archethicClient.transaction.new()
  .setType("transfer")
  .addUCOTransfer(contractAccount.address, Utils.parseBigInt("1"))

  console.log("Funding contract...")
  await fundingAccount.sendTransaction(fundingTx)

  console.log("Deploying contract...")
  const transactionAddress = await ctx.deployContract(contractAccount, {
    content: JSON.stringify({
      voters: [{hex: "0000627002d7d8b4d980fd77542c109ba06f4a2c53b23c26fc1b6a2cc389f66996d9"}]
    })
  })

  console.log(`Contract deployed at: ${transactionAddress}`)
  process.exit(0)
}

main().catch((error) => {
  console.error(error);
  process.exit(1)
});

