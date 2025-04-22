<script setup lang="ts">
import { useRoute } from "vue-router";
import { ref, onMounted, watch, computed, type Ref } from "vue";
import Archethic, { Utils } from "@archethicjs/sdk";

import TransactionItem from "@/components/multisig/TransactionItem.vue";
import Button from "@/components/Button.vue";
import TransactionFormVue from "@/components/multisig/TransactionForm.vue";
import SetupForm from "@/components/multisig/SetupForm.vue";
import Header from "@/components/multisig/Header.vue";
import Warning from "@/components/Warning.vue";
import Loading from "@/components/Loading.vue";

import { useConnectionStore } from "@/stores/connection";
import type { Setup, Transaction, TxData, TxSetup } from "@/types";
import type { Balance, Token } from "@archethicjs/sdk/dist/types";
import type TransactionBuilder from "@archethicjs/sdk/dist/transaction_builder";
import { getConfirmTransaction, getProposeTransaction, type MultisigSetup, type MultisigTransaction, type Recipient, type TokenTransfer, type UCOTransfer } from "@archethicjs/multisig-sdk";

const route = useRoute();

type multisigBalance = {
  uco: number;
  tokens: tokenBalance[]
}

type tokenBalance = Token & {
  address: string;
  amount: number;
  tokenId: number;
};

const transactions = ref([] as Transaction[]);
const voters = ref([] as string[]);
const requiredConfirmations = ref(0);
const hasSetupChanged = ref(false);
const balance = ref({ uco: 0, tokens: [] as tokenBalance[] } as multisigBalance);
const initialSetup = ref({} as Setup);

const mainErr = ref("");
const transactionFormErr = ref("");
const confirmationError = ref("");
const newSetupError = ref("");

const loadingAssets = ref(true);
const loadingTransactions = ref(true);
const loadingSetup = ref(true);

const pendingNewTransaction = ref(false);
const pendingConfirmation: Ref<null | number> = ref(null);
const pendingNewSetup = ref(false);

const canEdit = computed(() => {
  return (
    voters.value.find((v) => {
      return (
        v.toUpperCase() == connectionStore.accountAddress.toUpperCase()
      );
    }) != undefined
  );
});

const resetForm = ref(false);

const connectionStore = useConnectionStore();

let archethic: Archethic | undefined;
const contractAddress = route.params.contractAddress as string;

onMounted(async () => {
  archethic = await connectionStore.connect();
  await loadDetails();

  watch([requiredConfirmations, () => voters.value.length], () => {
    hasSetupChanged.value = true;
  });

  watch(
    () => connectionStore.accountAddress,
    async () => {
      await loadDetails();
    },
  );
});

async function loadDetails() {
  mainErr.value = "";
  try {
    await Promise.all([loadBalance(), loadStatus()]);
  } catch (e) {
    console.log(e)
    mainErr.value = (e as Error).message;
  } finally {
    loadingAssets.value = false;
    loadingSetup.value = false;
    loadingTransactions.value = false;
  }
}

async function loadBalance() {
  const multisigBalance = await archethic?.network.getBalance(contractAddress) as Balance;

  const tokens = await Promise.all(
    multisigBalance.token.map(async (token): Promise<tokenBalance> => {
      const tokenDetails = await archethic?.network.getToken(token.address) as Token;
      const tokenBalance = Object.assign({}, token, tokenDetails) as tokenBalance
      tokenBalance.amount = parseFloat(Utils.formatBigInt(BigInt(token.amount)))
      return tokenBalance
    }),
  );

  balance.value = {
    uco: parseFloat(Utils.formatBigInt(BigInt(multisigBalance.uco))),
    tokens: tokens,
  };
}

async function loadStatus() {
  let { confirmationThreshold, voters, transactions: musig_transactions } =
    await archethic?.network.callFunction(contractAddress as string, "getState", []);

  const setup = {
    voters: voters.map((a: any) => a.hex),
    confirmationThreshold: confirmationThreshold
  }
  setSetup(setup);

  let transactions: Record<number, any> = {}
  for (let id = 1; id <= Object.keys(musig_transactions).length; id++) {
    const transaction = musig_transactions[id];
    const formattedTx = {
      status: transaction.status,
      confirmations: transaction.confirmations.map((confirmation: any) => {
        return {
          confirmationAddress: confirmation.confirmationAddress.hex,
          from: confirmation.from.hex
        }
      }),
      from: transaction.from.hex,
      originTx: transaction.originTx ? transaction.originTx.hex : null,
      snapshotTransaction: transaction.snapshotTransaction ? transaction.snapshotTransaction.hex : null,
      txData: transaction.txData ? {
        content: transaction.txData.content,
        contract: transaction.txData.contract,
        ucoTransfers: transaction.txData.ucoTransfers ? transaction.txData.ucoTransfers.map((t: any): any => {
          return { to: t.to.hex, amount: t.amount }
        }) : [],
        tokenTransfers: transaction.txData.tokenTransfers ? transaction.txData.tokenTransfers.map((t: any): any => {
          return { to: t.to.hex, amount: t.amount, tokenAddress: t.tokenAddress.hex, tokenId: t.tokenId }
        }) : [],
        recipients: transaction.txData.recipients ? transaction.txData.recipients.map((r: any): any => {
          return { address: r.address.hex, action: r.action, args: r.args }
        }) : []
      }: null,
      setup: transaction.setup ? {
        newVoters: transaction.setup.newVoters.map((voter: any) => { return voter.hex }),
        removedVoters: transaction.setup.removedVoters.map((voter: any) => { return voter.hex }),
        confirmationThreshold: transaction.setup.confirmationThreshold
      } : { newVoters: [], removedVoters: [] },
    }

    transactions[id] = formattedTx;
  }

  loadTransactions(transactions, setup);
}

function setSetup(setup: Setup) {
  initialSetup.value = setup;
  voters.value = setup.voters;
  requiredConfirmations.value = setup.confirmationThreshold;
}

async function loadTransactions(musig_transactions: Record<number, Record<string, any>>, setup: Setup) {
  transactions.value = await Promise.all(
    Object.keys(musig_transactions).map(async (id: string) => {
      const transaction = musig_transactions[parseInt(id)];

      if (transaction.snapshotTransaction) {
        const { txData, setup, snapshotSetup } = await fetchStateStatus(
          transaction.snapshotTransaction,
          parseInt(id),
        );

        if ((txData || setup) && snapshotSetup) {
          return {
            id: parseInt(id),
            multisigSetup: snapshotSetup,
            status: transaction.status,
            confirmations: transaction.confirmations,
            snapshotTransaction: transaction.snapshotTransaction,
            originTx: transaction.originTx,
            from: transaction.from,
            txData: txData,
            setup: setup
          } as Transaction
        }
      }

      return {
        id: parseInt(id),
        multisigSetup: setup,
        status: transaction.status,
        confirmations: transaction.confirmations,
        originTx: transaction.originTx,
        from: transaction.from,
        txData: transaction.txData,
        setup: transaction.setup
      } as Transaction;
    }),
  );
}

async function fetchStateStatus(transactionAddress: string, id: number) {
  const res = await archethic?.network.rawGraphQLQuery(`
    query{
      transaction(address: "${transactionAddress}") {
        validationStamp {
          ledgerOperations{
              unspentOutputs {
                state
    		  }
          }
        }
      }
    }
    `);

  if (!res.transaction) {
    return {};
  }

  const state_utxo =
    res.transaction.validationStamp.ledgerOperations.unspentOutputs.find(
      (u: Record<string, any>) => u.state,
    );
  if (!state_utxo) {
    return {};
  }

  const { state } = state_utxo;
  const snapshotSetup: Setup = {
    confirmationThreshold: state.confirmationThreshold,
    voters: state.voters.map((voter: any): string => voter.hex)
  };
  const { txData, setup } = state.transactions[id];
  const formattedSetup = setup ? {
    newVoters: setup.newVoters.map((voter: any) => voter.hex),
    removedVoters: setup.removedVoters.map((voter: any) => voter.hex),
    confirmationThreshold: setup.confirmationThreshold
  } : null

  const formattedTxData = txData ? {
    ucoTransfers: txData.ucoTransfers ? txData.ucoTransfers.map((ucoTransfer: any) => {
      return {
        amount: ucoTransfer.amount,
        to: ucoTransfer.to.hex
      }
    }) : [],
    tokenTransfers: txData.tokenTransfers ? txData.tokenTransfers.map((tokenTransfer: any) => {
      return {
        amount: tokenTransfer.amount,
        to: tokenTransfer.to.hex,
        tokenAddress: tokenTransfer.tokenAddress.hex,
        tokenId: tokenTransfer.tokenId
      }
    }) : [],
    recipients: txData.recipients ? txData.recipients.map((recipient: any) => {
      return {
        to: recipient.to.hex,
        action: recipient.action,
        args: recipient.args
      }
    }) : [],
    content: txData.content,
    contract: txData.contract
  } : null

  return { txData: formattedTxData, setup: formattedSetup, snapshotSetup }
}

async function proposeNewTransaction(proposeTransaction?: TxData, proposeSetup?: TxSetup) {
  const chainSize = await archethic?.transaction.getTransactionIndex(contractAddress);
    
  const txFormatted = proposeTransaction? {
    ucoTransfers: proposeTransaction.ucoTransfers.map((ucoTransfer: UCOTransfer) => {
      return {
        amount: new Number(Utils.parseBigInt(ucoTransfer.amount.toString())) as number,
        to: ucoTransfer.to
      }
    }),
    tokenTransfers: proposeTransaction.tokenTransfers.map((tokenTransfer: TokenTransfer) => {
      return {
        amount: new Number(Utils.parseBigInt(tokenTransfer.amount.toString())) as number,
        to: tokenTransfer.to,
        tokenAddress: tokenTransfer.tokenAddress,
        tokenId: tokenTransfer.tokenId
      }
    }),
    content: proposeTransaction.content,
    contract: proposeTransaction.contract,
    recipients: proposeTransaction.recipients
  } : undefined
  
  const tx = getProposeTransaction(archethic as Archethic, contractAddress, txFormatted, proposeSetup)
  
  await archethic?.rpcWallet?.sendTransaction(tx as TransactionBuilder);
  await waitNewTransaction(contractAddress, chainSize as number);
  await loadDetails();
}

async function waitNewTransaction(
  contractAddress: string,
  previousChainSize: number,
  attempts = 1,
) {
  if (attempts > 10) {
    console.error("Timeout trying to watch new transaction on the multisig");
    return;
  }
  const chainSize =
    await archethic?.transaction.getTransactionIndex(contractAddress);
  if (chainSize == previousChainSize) {
    await new Promise((r) => setTimeout(r, 500 * attempts));
    await waitNewTransaction(contractAddress, previousChainSize, attempts++);
  }
}

async function handleProposeTransaction(proposeTransaction: TxData, proposeSetup?: TxSetup) {
  pendingNewTransaction.value = true;
  transactionFormErr.value = "";

  try {
    await proposeNewTransaction(proposeTransaction, proposeSetup);
    resetForm.value = true;
  } catch (e) {
    transactionFormErr.value = (e as Error).message;
  } finally {
    pendingNewTransaction.value = false;
  }
}

async function handleTransactionConfirmation(transactionId: number) {
  pendingConfirmation.value = transactionId;
  confirmationError.value = "";
  const chainSize =
    await archethic?.transaction.getTransactionIndex(contractAddress) as number;

  const tx = getConfirmTransaction(archethic as Archethic, contractAddress, Number(transactionId))

  try {
    await archethic?.rpcWallet?.sendTransaction(tx as TransactionBuilder);
    await waitNewTransaction(contractAddress, chainSize);
    await loadDetails();
  } catch (e) {
    confirmationError.value = (e as Error).message;;
  } finally {
    pendingConfirmation.value = null;
  }
}

async function proposeNewSetup() {
  const initialConfirmationThreshold = initialSetup.value.confirmationThreshold;

  const updatedVoters = new Set(
    voters.value,
  );
  const initalVoterSet = new Set(initialSetup.value.voters);

  let removedVoters: string[] = [];
  let newVoters: string[] = [];
  for (let voter of initalVoterSet) {
    if (!updatedVoters.has(voter)) {
      removedVoters.push(voter);
    }
  }

  for (let voter of updatedVoters) {
    if (!initalVoterSet.has(voter)) {
      newVoters.push(voter);
    }
  }

  const newSetup: TxSetup = {};
  if (newVoters.length > 0) {
    newSetup.newVoters = newVoters;
  }
  if (removedVoters.length > 0) {
    newSetup.removedVoters = removedVoters;
  }
  if (initialConfirmationThreshold != requiredConfirmations.value) {
    newSetup.newThreshold = requiredConfirmations.value;
  }

  pendingNewSetup.value = true;
  newSetupError.value = "";

  try {
    await proposeNewTransaction(undefined, newSetup);
  } catch (e) {
    newSetupError.value = (e as Error).message;;
  } finally {
    pendingNewSetup.value = false;
  }
}

function handleNewVoters(newVoters: string[]) {
  voters.value = newVoters;
  if (newVoters.length < initialSetup.value.confirmationThreshold) {
    requiredConfirmations.value = newVoters.length;
  }
}

function handleNewConfirmationThreshold(newRequiredConfirmations: number) {
  requiredConfirmations.value = newRequiredConfirmations;
}
</script>

<template>
  <div class="flex flex-col p-10">
    <div class="bg-white shadow-xl p-5 rounded-md w-full flex-col">
      <Header
        :loading="loadingAssets"
        :address="contractAddress"
        :endpoint="connectionStore.endpoint"
        :balance="balance"
      />

      <Warning v-show="mainErr != ''" class="mt-5">{{ mainErr }}</Warning>
    </div>

    <div class="flex justify-between gap-5 mt-5">
      <div class="w-3/5 bg-white shadow-xl p-5 rounded-md">
        <header class="flex justify-between place-items-center">
          <h3 class="text-xl mb-5">Transactions</h3>
        </header>
        <Loading v-if="loadingTransactions" />
        <TransactionItem
          v-for="transaction in transactions"
          :transaction="transaction"
          :requiredConfirmations="transaction.multisigSetup.confirmationThreshold"
          :nbVoters="voters.length"
          :pendingConfirmation="pendingConfirmation == transaction.id"
          @confirm-transaction="handleTransactionConfirmation"
        />

        <Warning v-show="confirmationError != ''" class="mt-5">{{
          confirmationError
        }}</Warning>
      </div>
      <div class="w-3/5 bg-white shadow-xl p-5 rounded-md">
        <header class="mb-5 flex justify-between place-items-center">
          <h2 class="text-xl mb-5s">Setup</h2>
          <Button
            class="text-xs h-8"
            v-show="hasSetupChanged"
            @click="proposeNewSetup"
            :disabled="pendingNewSetup"
          >
            <span v-show="!pendingNewSetup">Propose setup's change</span>
            <span v-show="pendingNewSetup">Pending...</span>
          </Button>
        </header>
        <Loading v-if="loadingSetup" />
        <SetupForm
          :voters="voters"
          :requiredConfirmations="requiredConfirmations"
          @new-voters="handleNewVoters"
          @new-confirmation-threshold="handleNewConfirmationThreshold"
          v-if="!loadingSetup && mainErr == ''"
          :canEdit="canEdit && !pendingNewSetup"
        />
        <Warning v-show="newSetupError != ''" class="mt-5">{{
          newSetupError
        }}</Warning>
      </div>
    </div>
    <div class="mt-5 bg-white shadow-xl p-5 rounded-md w-full" v-show="canEdit">
      <header class="flex justify-between place-items-center">
        <h3 class="text-xl mb-5">Transaction builder</h3>
      </header>
      <TransactionFormVue
        @proposeTransaction="(txData) => handleProposeTransaction(txData)"
        :tokens="balance.tokens"
        :pending="pendingNewTransaction"
        :toReset="resetForm"
      />

      <Warning v-show="transactionFormErr != ''" class="mt-5">{{
        transactionFormErr
      }}</Warning>
    </div>
  </div>
</template>
