import type { Contract } from "@archethicjs/sdk/dist/contract";

export type Setup = {
  confirmationThreshold: number,
  voters: string[]
}

export type TokenTransfer = {
  to: string;
  amount: number;
  tokenAddress: string;
}

export type UCOTransfer = {
  to: string;
  amount: number;
}


export type Recipient = {
  address: string;
  action: string;
  args: any[];
}

export type TxData = {
  content: string;
  contract?: Contract;
  ucoTransfers: UCOTransfer[];
  tokenTransfers: TokenTransfer[];
  recipients: Recipient[];
}

export type TxSetup = {
  newVoters?: string[];
  removedVoters?: string[];
  newThreshold?: number;
}

export enum TransactionStatus {
  Pending = "pending",
  Done = "done"
}

export type Transaction = {
  id: number;
  txData?: TxData;
  setup?: TxSetup;
  multisigSetup: Setup;
  status: TransactionStatus;
  confirmations: Confirmation[]
  snapshopTx?: string;
  originTx: string;
  from: string;
}

export type Confirmation = {
  confirmationAddress: string;
  from: string;
}