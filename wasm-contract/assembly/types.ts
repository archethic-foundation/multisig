import { Address, getFirstTransactionAddress, JSON, Nullable, TransactionBuilder, log } from "@archethicjs/ae-contract-as";

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
}

export namespace Status {
  export const Pending = "pending";
  export const Done = "done";
}
export type Status = string;

export class Transaction {
  status: Status = Status.Pending;
  setup: NewSetup | null = null;
  txData: TxData | null = null;
  from!: Address;
  confirmations: Address[] = [];
  originTx!: Address;
  snapshotTransaction: Address | null = null;

  isThresholdReach(threshold: u32): bool {
    return (this.confirmations.length + 1) as u32 >= threshold;
  }

  alreadyVoted(address: Address): bool {
    let voted = false;
    for (let i = 0; i < this.confirmations.length; i++) {
      if(Address.compare(this.confirmations[i], address)) {
        voted = true;
        break;
      }
    }
    return voted;
  }
}

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
        builder.addRawRecipient(this.recipients[i].address, action, this.recipients[i].args)
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
  args: JSON.Raw = ""
}

export class VoterSet {
  set: Set<string> = new Set<string>()
  constructor(voters: Address[]) {
      for(let i = 0; i < voters.length; i++) {
          // Formalize case
          this.set.add(new Address(voters[i].hex).hex)
      }
  }

  has(address: Address): bool {
      return this.set.has(address.hex)
  }

  add(address: Address): void {
    this.set.add(address.hex)
  }

  delete(address: Address): void {
    this.set.delete(address.hex)
  }

  get size(): u32 { return this.set.size as u32}

  toAddressList(): Address[] {
    let addresses: Address[] = [];
    let hexAddresses = this.set.values()
    for(let i = 0; i < hexAddresses.length; i++) {
      addresses[i] = new Address(hexAddresses[i])
    }
    return addresses;
  }
}

export class InitParams {
  voters!: Address[];
  confirmationThreshold: u32 = 1;
}

export class ProposalParams {
  txData: TxData | null = null;
  setup: NewSetup | null = null;
}

export class ConfirmationParams {
  transactionId! :u64;
}