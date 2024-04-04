#!/usr/bin/env node

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

import deploy_multisig from "./commands/deploy_multisig.js";
import new_transaction from "./commands/new_transaction.js";
import confirm_transaction from "./commands/confirm_transaction.js";

const y = yargs(hideBin(process.argv));

y.command(deploy_multisig);
y.command(new_transaction);
y.command(confirm_transaction);

y.demandCommand(1, "");

y.parse();

y.fail(function (msg, err) {
  if (err) {
    throw err;
  }
  console.log(msg);
  process.exit(1);
});
