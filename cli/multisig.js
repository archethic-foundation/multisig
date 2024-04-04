#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import deploy_multisig from "./commands/deploy_multisig.js";
import new_transaction from "./commands/new_transaction.js";
import confirm_transaction from "./commands/confirm_transaction.js";

const y = yargs(hideBin(process.argv));

y.command(deploy_multisig).help();
y.command(new_transaction).help();
y.command(confirm_transaction).help();

y.command({
  command: "*",
  handler: () => {
    y.showHelp();
    process.exit(0);
  },
});

y.fail((_msg, err) => {
  console.log(new Error(err));
  process.exit(1);
});

y.help();

y.parse();
