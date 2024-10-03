import { Address, Nullable, TransactionBuilder } from "@archethicjs/ae-contract-as";

export class State {
  lastID: u64 = 0;
  transactions: Map<u64, Transaction> = new Map<u64, Transaction>();
  voters: Address[] = [];
  confirmationThreshold: u32 = 1;

  constructor(initialVoters: Address[], confirmationThreshold: u32) {
      this.voters = initialVoters;
      this.confirmationThreshold = confirmationThreshold;
  }

  getLastID(): u64 {
      this.lastID += 1;
      return this.lastID
  }

  setTransactionById(transactionId: u64, tx: Transaction): State {
    this.transactions.set(transactionId, tx)
    return this
  }
}

@json
export class TransactionConfirmation {
  from!: Address;
  confirmationAddress!: Address;
}

@json
export class Transaction {
  status: Status = Status.Pending;
  setup: NewSetup | null = null;
  txData: TxData | null = null;
  from: Address;
  confirmations: TransactionConfirmation[] = [];
  originTx: Address;
  snapshotTransaction: Address | null = null;

  constructor(from: Address, originTx: Address, txData: TxData | null = null, setup: NewSetup | null = null) {
    this.status = Status.Pending;
    this.txData = txData;
    this.setup = setup;
    this.originTx = originTx;
    this.from = from;
  }

  isThresholdReached(threshold: u32): bool {
    return (this.confirmations.length + 1) as u32 >= threshold;
  }

  confirm(voterAddress: Address, transactionAddress: Address): void {
    this.confirmations.push({ from: voterAddress, confirmationAddress: transactionAddress});
  }

  alreadyVoted(address: Address): bool {
    let voted = false;
    for (let i = 0; i < this.confirmations.length; i++) {
      if(Address.compare(this.confirmations[i].from, address)) {
        voted = true;
        break;
      }
    }
    return voted;
  }

  seal(contractAddress: Address): void {
    this.snapshotTransaction = contractAddress;
    this.txData = null;
    this.setup = null;
    this.status = Status.Done
  }
}


export namespace Status {
  export const Pending = "pending";
  export const Done = "done";
}
export type Status = string;

@json
export class TxData {
  ucoTransfers: UCOTransfer[] = [];
  tokenTransfers: TokenTransfer[] = [];
  recipients: Recipient[] = []
  content: string | null = null;

  getTransactionBuilder(): TransactionBuilder {
    const builder = new TransactionBuilder()

    const txContent = this.content
    if (txContent != null) builder.setContent(txContent)
    
    for (let i = 0; i < this.ucoTransfers.length; i++) {
      builder.addUCOTransfer(this.ucoTransfers[i].to, this.ucoTransfers[i].amount)
    }

    for (let i = 0; i < this.tokenTransfers.length; i++) {
      builder.addTokenTransfer(this.tokenTransfers[i].to, this.tokenTransfers[i].amount, this.tokenTransfers[i].tokenAddress, this.tokenTransfers[i].tokenId)
    }

    for (let i = 0; i < this.recipients.length; i++) {
      const action = this.recipients[i].action
      if (action != null) {
        builder.addRecipient(this.recipients[i].address, action, this.recipients[i].args)
      }
    }
      
    return builder
  }
}

export class NewSetup {
  newVoters: Address[] = [];
  removedVoters: Address[] = [];
  confirmationThreshold: Nullable<u32> | null = null;
} 


export class UCOTransfer {
  to!: Address;
  amount!: u64;
}

export class TokenTransfer {
  to!: Address;
  amount!: u64;
  tokenAddress!: Address;
  tokenId!: u32;
}

export class Recipient {
  address!: Address;
  action: string | null = null;
  args: string = ""
}
