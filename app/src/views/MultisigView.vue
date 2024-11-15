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
import type { Setup, Transaction, TxData, TxSetup, Voter } from "@/types";
import type { Balance, Token } from "@archethicjs/sdk/dist/types";
import type TransactionBuilder from "@archethicjs/sdk/dist/transaction_builder";
import { getConfirmTransaction, getProposeTransaction, type MultisigSetup, type MultisigTransaction, type Recipient, type TokenTransfer, type UCOTransfer } from "ae-multisig";

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

type removableVoter = Voter & {
  removable: boolean;
}

const transactions = ref([] as Transaction[]);
const voters = ref([] as removableVoter[]);
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
        v.address.toUpperCase() == connectionStore.accountAddress.toUpperCase()
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
  let { setup: setup, transactions: musig_transactions } =
    await archethic?.network.callFunction(contractAddress as string, "status", []);

  setup = {
    voters: setup.voters.map((a: string) => { return { address: a} as Voter }),
    confirmationThreshold: setup.confirmation_threshold
  }
  setSetup(setup);
  loadTransactions(musig_transactions, setup);
}

function setSetup(setup: Setup) {
  initialSetup.value = setup;

  voters.value = setup.voters.map((voter, _index, list) => {
    return {
      address: voter.address,
      removable:
        list.length > 0 &&
        voter.address.toUpperCase() != connectionStore.accountAddress.toUpperCase(),
    };
  });

  requiredConfirmations.value = setup.confirmationThreshold;
}

async function loadTransactions(musig_transactions: Record<number, Record<string, any>>, setup: Setup) {
  transactions.value = await Promise.all(
    Object.keys(musig_transactions).map(async (id: string) => {
      const transaction = musig_transactions[parseInt(id)];

      if (transaction.details_tx) {
        const { txData, setup, snapshotSetup } = await fetchStateStatus(
          transaction.details_tx,
          parseInt(id),
        );
        if (txData && setup && snapshotSetup) {
          const tx = explode_tx(txData, setup)
          return Object.assign(tx, {
            id: parseInt(id),
            multisigSetup: snapshotSetup,
            status: transaction.status,
            confirmations: transaction.confirmations,
            detailsTx: transaction.details_tx,
            originTx: transaction.origin_tx,
            from: transaction.from,
          }) as Transaction
        }
      }

      const tx = explode_tx(transaction.tx_data, transaction.setup)
      return Object.assign(tx,
        {
          id: parseInt(id),
          multisigSetup: setup,
          status: transaction.status,
          confirmations: transaction.confirmations,
          detailsTx: transaction.details_tx,
          originTx: transaction.origin_tx,
          from: transaction.from
        }
      ) as Transaction;
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
    confirmationThreshold: state.confirmation_threshold,
    voters: state.voters.map((voterAddress: string): Voter => { return { address: voterAddress } as Voter })
  };
  const { tx_data, setup } = state.transactions[id];
  return { txData: tx_data, setup, snapshotSetup }
}

type explodedTx = {
  txData: TxData;
  setup: TxSetup;
}

function explode_tx(txData?: Record<string, any>, setup?: Record<string, any>): explodedTx {
  return {
    txData: {
      ucoTransfers: txData ? txData.uco_transfers: [],
      tokenTransfers: txData ? txData.token_transfers: [],
      code: txData ? txData.code : "",
      content: txData ? txData.content : "",
      recipients: txData ? txData.recipients : []
    } as TxData,
    setup: {
      newVoters: setup && setup.new_voters ? setup.new_voters : [],
      removedVoters: setup && setup.removed_voters ? setup.removed_voters : [],
      newThreshold: setup ? setup.confirmation_threshold : undefined,
    } as TxSetup
  }
}

async function proposeNewTransaction(proposeTransaction?: TxData, proposeSetup?: TxSetup) {
  const newTx: MultisigTransaction = proposeTransaction
    ? {
        ucoTransfers: proposeTransaction.ucoTransfers as UCOTransfer[],
        tokenTransfers: proposeTransaction.tokenTransfers as TokenTransfer[],
        recipients: proposeTransaction.recipients as Recipient[],
        code: proposeTransaction.code,
        content: proposeTransaction.content,
      }
    : {
        ucoTransfers: [],
        tokenTransfers: [],
        recipients: [],
        code: "",
        content: "",
      };

  const newSetup: MultisigSetup = proposeSetup
    ? {
        newVoters: proposeSetup.newVoters,
        removedVoters: proposeSetup.removedVoters,
        confirmationThreshold: proposeSetup.newThreshold,
      }
    : {};

  const chainSize = await archethic?.transaction.getTransactionIndex(contractAddress);
    
  const tx = getProposeTransaction(archethic as Archethic, contractAddress, newTx, newSetup)
  
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
  const initialVoters = initialSetup.value.voters.map(x => x.address)
  const initialConfirmationThreshold =
    initialSetup.value.confirmationThreshold;

  const updatedVoters = new Set(
    voters.value.map(({ address: address }) => address),
  );
  const initalVoterSet = new Set(initialVoters);

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

function handleNewVoters(newVoters: Voter[]) {
  voters.value = newVoters as removableVoter[];
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
