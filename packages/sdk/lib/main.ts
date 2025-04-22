import Archethic from "@archethicjs/sdk";
import TransactionBuilder from "@archethicjs/sdk/dist/transaction_builder";
import { TransactionData } from "@archethicjs/sdk/dist/types";
import {Contract, newContractTransaction} from "@archethicjs/sdk/dist/contract"
import { formatBigInt, uint8ArrayToHex } from "@archethicjs/sdk/dist/utils";
import { ExtendedTransactionBuilder } from "@archethicjs/sdk/dist/transaction";

export type MultisigInit = {
  voters: string[],
  confirmationThreshold: number
}

export type MultisigSetup = {
  newVoters?: string[];
  removedVoters?: string[];
  confirmationThreshold?: number;
}

export class MultisigTransaction {
  content: string = "";
  contract?: Contract;
  ucoTransfers: UCOTransfer[] = [];
  tokenTransfers: TokenTransfer[] = [];
  recipients: Recipient[] = [] ;

  static fromTransactionBuilder(tx: TransactionBuilder): MultisigTransaction {
    return {
      content: tx.data.content ? tx.data.content : "",
      contract: tx.data.contract,
      ucoTransfers: tx.data.ledger.uco.transfers.map((t): Transfer => {
        return { to: uint8ArrayToHex(t.to), amount: parseFloat(formatBigInt(t.amount)) }
      }),
      tokenTransfers: tx.data.ledger.token.transfers.map((t): TokenTransfer => {
        return { to: uint8ArrayToHex(t.to), amount: parseFloat(formatBigInt(t.amount)), tokenAddress: uint8ArrayToHex(t.tokenAddress), tokenId: t.tokenId || 0 }
      }),
      recipients: tx.data.recipients.map((r): Recipient => {
        return { address: uint8ArrayToHex(r.address), action: r.action, args: r.args}
      })
    }
  }
}

interface Transfer {
  amount: number;
  to: string;
} 

export type UCOTransfer = Transfer;
export type TokenTransfer = {
  tokenAddress: string;
  tokenId?: number;
} & Transfer

export type Recipient = {
  address: string;
  action?: string;
  args?: any[] | object
}

export function getDeployTransaction(archethic: Archethic, setup: MultisigInit, seed: Uint8Array | string, contract: Contract): Promise<ExtendedTransactionBuilder> {
  return newContractTransaction(archethic, contract, seed, {
    content: JSON.stringify({
      voters: setup.voters.map((x) => {
        return { hex: x }
      }),
      confirmationThreshold: setup.confirmationThreshold,
    })
  } as TransactionData)
}

export function getProposeTransaction(archethic: Archethic, contractAddress: string, txData?: MultisigTransaction, setup?: MultisigSetup): TransactionBuilder {
  return archethic.transaction
    .new()
    .setType("transfer")
    .addRecipient(contractAddress, "proposeTransaction", { txData: txData, setup: setup });
}

export function getConfirmTransaction(archethic: Archethic, contractAddress: string, transactionId: number): TransactionBuilder {
  return archethic?.transaction
    .new()
    .setType("transfer")
    .addRecipient(contractAddress, "confirmTransaction", { transactionId });
}
