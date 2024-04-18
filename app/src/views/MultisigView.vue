<script setup>
import { useRoute } from "vue-router";
import { ref, onMounted, watch, computed } from "vue";
import { Utils } from "@archethicjs/sdk";

import Transaction from "@/components/multisig/Transaction.vue";
import Button from "@/components/Button.vue";
import TransactionFormVue from "@/components/multisig/TransactionForm.vue";
import Setup from "@/components/multisig/Setup.vue";
import Header from "@/components/multisig/Header.vue";
import Warning from "@/components/Warning.vue";
import Loading from "@/components/Loading.vue";

import { useConnectionStore } from "@/stores/connection";

const route = useRoute();

const transactions = ref([]);
const voters = ref([]);
const requiredConfirmations = ref(0);
const hasSetupChanged = ref(false);
const balance = ref({ uco: 0, tokens: {} });
const initialSetup = ref({});

const mainErr = ref("");
const transactionFormErr = ref("");
const confirmationError = ref("");
const newSetupError = ref("");

const loadingAssets = ref(true);
const loadingTransactions = ref(true);
const loadingSetup = ref(true);

const pendingNewTransaction = ref(false);
const pendingConfirmation = ref(false);
const pendingNewSetup = ref(false);

const canEdit = computed(() => {
    return (
        voters.value.find((v) => {
            return (
                v.address.toUpperCase() ==
                connectionStore.accountAddress.toUpperCase()
            );
        }) != undefined
    );
});

const connectionStore = useConnectionStore();

let archethic;
const contractAddress = route.params.contractAddress;

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
        mainErr.value = e;
    } finally {
        loadingAssets.value = false;
        loadingSetup.value = false;
        loadingTransactions.value = false;
    }
}

async function loadBalance() {
    const multisigBalance = await archethic.network.getBalance(contractAddress);

    const tokens = await Promise.all(
        multisigBalance.token.map(async (token) => {
            const tokenDetails = await archethic.network.getToken(
                token.address,
            );
            token.amount = Utils.fromBigInt(token.amount);
            token.name = tokenDetails.name;
            token.symbol = tokenDetails.symbol;
            return token;
        }),
    );

    balance.value = {
        uco: Utils.fromBigInt(multisigBalance.uco),
        tokens: tokens,
    };
}

async function loadStatus() {
    const { setup: setup, transactions: musig_transactions } =
        await archethic.network.callFunction(contractAddress, "status");

    setSetup(setup);
    loadTransactions(musig_transactions, setup);
}

function setSetup(setup) {
    initialSetup.value = setup;

    voters.value = setup.voters.map((voter, _index, list) => {
        return {
            address: voter,
            removable:
                list.length > 0 &&
                voter.toUpperCase() !=
                    connectionStore.accountAddress.toUpperCase(),
        };
    });

    requiredConfirmations.value = setup.confirmation_threshold;
}

async function loadTransactions(musig_transactions, setup) {
    transactions.value = await Promise.all(
        Object.keys(musig_transactions).map(async (id) => {
            const transaction = musig_transactions[id];

            if (transaction.details_tx) {
                const retrievedStatus = await fetchStateStatus(
                    transaction.details_tx,
                    id,
                );
                if (
                    retrievedStatus.tx_data &&
                    retrievedStatus.setup &&
                    retrievedStatus.snapshotSetup
                ) {
                    return Object.assign(
                        {
                            id: id,
                            status: transaction.status,
                            confirmations: transaction.confirmations,
                            setup: retrievedStatus.snapshotSetup,
                            from: transaction.from,
                        },
                        explode_tx(
                            retrievedStatus.tx_data,
                            retrievedStatus.setup,
                        ),
                    );
                }
            }

            return Object.assign(
                {
                    id: id,
                    status: transaction.status,
                    details_tx: transaction.details_tx,
                    confirmations: transaction.confirmations,
                    from: transaction.from,
                    setup: {
                        confirmationThreshold: setup.confirmation_threshold,
                    },
                },
                explode_tx(transaction.tx_data, transaction.setup),
            );
        }),
    );
}

async function fetchStateStatus(transactionAddress, id) {
    const res = await archethic.network.rawGraphQLQuery(`
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
            (u) => u.state,
        );
    if (!state_utxo) {
        return {};
    }

    const { state } = state_utxo;
    const snapshotSetup = {
        confirmationThreshold: state.confirmation_threshold,
    };
    const { tx_data: tx_data, setup: setup } = state.transactions[id];
    return {
        tx_data,
        setup,
        snapshotSetup,
    };
}

function explode_tx(tx_data, setup) {
    return {
        ucoTransfers: tx_data ? tx_data.uco_transfers : [],
        tokenTransfers: tx_data ? tx_data.token_transfers : [],
        code: tx_data ? tx_data.code : "",
        recipients: tx_data ? tx_data.recipients : [],
        newVoters:
            setup && setup.new_voters
                ? setup.new_voters.map((voter) => {
                      return { address: voter };
                  })
                : [],
        removedVoters:
            setup && setup.removed_voters
                ? setup.removed_voters.map((voter) => {
                      return { address: voter };
                  })
                : [],
        newThreshold: setup ? setup.confirmation_threshold : undefined,
    };
}

async function proposeNewTransaction(proposeTransaction, proposeSetup) {
    const newTx = proposeTransaction
        ? {
              uco_transfers: proposeTransaction.ucoTransfers,
              token_transfers: proposeTransaction.tokenTransfers,
              recipients: proposeTransaction.contractCalls,
              code: proposeTransaction.code,
          }
        : { uco_transfers: [], token_transfers: [], recipients: [], code: "" };

    const newSetup = proposeSetup
        ? {
              new_voters: proposeSetup.newVoters,
              removed_voters: proposeSetup.removedVoters,
              confirmation_threshold: proposeSetup.confirmationThreshold,
          }
        : {};

    const chainSize =
        await archethic.transaction.getTransactionIndex(contractAddress);

    const tx = archethic.transaction
        .new()
        .setType("transfer")
        .addRecipient(contractAddress, "new_transaction", [newTx, newSetup]);

    await archethic.rpcWallet.sendTransaction(tx);
    await waitNewTransaction(contractAddress, chainSize);
    await loadDetails();
}

async function waitNewTransaction(
    contractAddress,
    previousChainSize,
    attempts = 1,
) {
    if (attempts > 10) {
        console.error(
            "Timeout trying to watch new transaction on the multisig",
        );
        return;
    }
    const chainSize =
        await archethic.transaction.getTransactionIndex(contractAddress);
    if (chainSize == previousChainSize) {
        await new Promise((r) => setTimeout(r, 500 * attempts));
        await waitNewTransaction(
            contractAddress,
            previousChainSize,
            attempts++,
        );
    }
}

async function handleProposeTransaction(proposeTransaction, proposeSetup) {
    pendingNewTransaction.value = true;
    transactionFormErr.value = "";

    try {
        await proposeNewTransaction(proposeTransaction, proposeSetup);
    } catch (e) {
        transactionFormErr.value = e;
    } finally {
        pendingNewTransaction.value = false;
    }
}

async function handleTransactionConfirmation(transactionId) {
    pendingConfirmation.value = true;
    confirmationError.value = "";
    const chainSize =
        await archethic.transaction.getTransactionIndex(contractAddress);

    const tx = archethic.transaction
        .new()
        .setType("transfer")
        .addRecipient(contractAddress, "confirm_transaction", [
            Number(transactionId),
        ]);

    try {
        await archethic.rpcWallet.sendTransaction(tx);
        await waitNewTransaction(contractAddress, chainSize);
        await loadDetails();
    } catch (e) {
        confirmationError.value = e;
    } finally {
        pendingConfirmation.value = false;
    }
}

async function proposeNewSetup() {
    const initialVoters = initialSetup.value.voters;
    const initialConfirmationThreshold =
        initialSetup.value.confirmation_threshold;

    const updatedVoters = new Set(
        voters.value.map(({ address: address }) => address),
    );
    const initalVoterSet = new Set(initialVoters);

    let removedVoters = [];
    let newVoters = [];
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

    const newSetup = {};
    if (newVoters.length > 0) {
        newSetup.newVoters = newVoters;
    }
    if (removedVoters.length > 0) {
        newSetup.removedVoters = removedVoters;
    }
    if (initialConfirmationThreshold != requiredConfirmations.value) {
        newSetup.confirmationThreshold = requiredConfirmations.value;
    }

    pendingNewSetup.value = true;
    newSetupError.value = "";

    try {
        await proposeNewTransaction(null, newSetup);
    } catch (e) {
        newSetupError.value = e;
    } finally {
        pendingNewSetup.value = false;
    }
}

function handleNewVoters(newVoters) {
    voters.value = newVoters;
    if (newVoters.length < initialSetup.confirmation_threshold) {
        requiredConfirmations.value = newVoters.length;
    }
}

function handleNewConfirmationThreshold(newRequiredConfirmations) {
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
                <Transaction
                    v-for="transaction in transactions"
                    :transaction="transaction"
                    :requiredConfirmations="
                        transaction.setup.confirmationThreshold
                    "
                    :nbVoters="voters.length"
                    :pendingConfirmation="pendingConfirmation"
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
                        <span v-show="!pendingNewSetup"
                            >Propose setup's change</span
                        >
                        <span v-show="pendingNewSetup">Pending...</span>
                    </Button>
                </header>
                <Loading v-if="loadingSetup" />
                <Setup
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
        <div
            class="mt-5 bg-white shadow-xl p-5 rounded-md w-full"
            v-show="canEdit"
        >
            <header class="flex justify-between place-items-center">
                <h3 class="text-xl mb-5">Transaction builder</h3>
            </header>
            <TransactionFormVue
                @propose-transaction="handleProposeTransaction"
                :pending="pendingNewTransaction"
            />

            <Warning v-show="transactionFormErr != ''" class="mt-5">{{
                transactionFormErr
            }}</Warning>
        </div>
    </div>
</template>
