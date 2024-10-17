export type Setup = {
  confirmationThreshold: number,
  voters: Voter[]
}

export type Voter = {
  address: string;
  name?: string;
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
  code: string;
  ucoTransfers: UCOTransfer[];
  tokenTransfers: TokenTransfer[];
  recipients: Recipient[];
}

export type TxSetup = {
  newVoters?: string[];
  removedVoters?: string[];
  newThreshold?: number;
}

export type TransactionStatus = "pending" | "done"

export type Transaction = {
  id: number;
  txData?: TxData;
  setup: TxSetup;
  status: TransactionStatus;
  confirmations: string[]
  detailsTx: string;
  originTx: string;
  from: string;
  multisigSetup: Setup;
}
