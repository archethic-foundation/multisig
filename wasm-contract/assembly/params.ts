import { Address } from "@archethicjs/ae-contract-as";
import { TxData, NewSetup } from "./state";

@json
export class InitParams {
  voters!: Address[];
  confirmationThreshold: u32 = 1;
}

@json
export class ProposalParams {
  txData: TxData | null = null;
  setup: NewSetup | null = null;
}

@json
export class ConfirmationParams {
  transactionId! :u64;
}