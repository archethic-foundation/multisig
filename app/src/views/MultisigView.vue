<script setup>
import { useRoute } from "vue-router";
import { ref, onMounted, watch, toRaw } from "vue";
import { Utils } from "@archethicjs/sdk";

import Transaction from "@/components/multisig/Transaction.vue";
import Voter from "@/components/multisig/Voter.vue";
import List from "@/components/List.vue";
import Button from "@/components/Button.vue";
import TransactionFormVue from "@/components/multisig/TransactionForm.vue";
import Setup from "@/components/multisig/Setup.vue";

import { useConnectionStore } from "@/stores/connection";

const route = useRoute();

const transactions = ref([]);
const voters = ref([]);
const requiredConfirmations = ref(0);
const hasSetupChanged = ref(false);
const balance = ref({ uco: 0, tokens: {} });

const connectionStore = useConnectionStore();

let archethic;
const contractAddress = route.params.contractAddress;

const initialSetup = ref({});

onMounted(async () => {
    archethic = await connectionStore.connect();

    await loadDetails();

    watch([requiredConfirmations, () => voters.value.length], () => {
        hasSetupChanged.value = true;
    });

    await archethic.rpcWallet.onCurrentAccountChange(async () => {
        await loadDetails();
    });
});

async function loadDetails() {
    const { setup: setup, transactions: musig_transactions } =
        await archethic.network.callFunction(contractAddress, "status");

    const multisigBalance = await archethic.network.getBalance(contractAddress);
    balance.value = {
        uco: Utils.fromBigInt(multisigBalance.uco),
        token: multisigBalance.token.map((token) => {
            token.amount = Utils.fromBigInt(token.amount);
            return token;
        }),
    };

    initialSetup.value = setup;

    voters.value = setup.voters.map((voter) => {
        return { address: voter };
    });

    requiredConfirmations.value = setup.confirmation_threshold;

    transactions.value = await Promise.all(
        Object.keys(musig_transactions).map(async (id) => {
            const transaction = musig_transactions[id];

            if (transaction.details_tx) {
                const res = await archethic.network.rawGraphQLQuery(`
                query{
                  transaction(address: "${transaction.details_tx}") {
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

                if (res.transaction) {
                    const state_utxo =
                        res.transaction.validationStamp.ledgerOperations.unspentOutputs.find(
                            (u) => u.state,
                        );
                    if (state_utxo) {
                        const { state } = state_utxo;
                        const snapshotSetup = {
                            confirmationThreshold: state.confirmation_threshold,
                        };
                        const { tx_data: tx_data, setup: setup } =
                            state.transactions[id];

                        return Object.assign(
                            {
                                id: id,
                                status: transaction.status,
                                confirmations: transaction.confirmations,
                                setup: snapshotSetup,
                                from: transaction.from,
                            },
                            explode_tx(tx_data, setup),
                        );
                    }
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

async function handleProposeTransaction(proposeTransaction, proposeSetup) {
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

    const { transactionAddress } =
        await archethic.rpcWallet.sendTransaction(tx);

    await waitNewTransaction(contractAddress, chainSize);
    await loadDetails();
}

async function waitNewTransaction(
    contractAddress,
    previousChainSize,
    attempts = 10,
) {
    if (attempts == 0) {
        console.error(
            "Timeout trying to watch new transaction on the multisig",
        );
        return;
    }
    const chainSize =
        await archethic.transaction.getTransactionIndex(contractAddress);
    if (chainSize == previousChainSize) {
        await new Promise((r) => setTimeout(r, 500));
        waitNewTransaction(contractAddress, previousChainSize, attempts - 1);
    }
}

async function handleTransactionConfirmation(transactionId) {
    const chainSize =
        await archethic.transaction.getTransactionIndex(contractAddress);

    const tx = archethic.transaction
        .new()
        .setType("transfer")
        .addRecipient(contractAddress, "confirm_transaction", [
            Number(transactionId),
        ]);

    await archethic.rpcWallet.sendTransaction(tx);

    await waitNewTransaction(contractAddress, chainSize);
    await loadDetails();
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

    await handleProposeTransaction(null, newSetup);
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

function shortenAddress(address) {
    return `${address.slice(0, 8)}...${address.slice(address.length - 8)}`;
}
</script>

<template>
    <div class="flex flex-col p-10 h-screen">
        <div class="bg-white shadow-xl p-5 rounded-md w-full flex-col">
            <h2 class="text-xl text-slate-600">
                Vault's address: {{ contractAddress }}
            </h2>
            <div>
                <p class="mt-10 mb-2">Assets</p>
                <div class="flex-col">
                    <div class="flex">
                        <p class="text-slate-500">UCO</p>
                        <p class="text-slate-500 ml-3">{{ balance.uco }}</p>
                    </div>
                    <div v-for="token in balance.token" class="flex mt-2">
                        <p class="text-slate-500">
                            Token {{ shortenAddress(token.address) }}
                        </p>
                        <p class="text-slate-500 ml-3">{{ token.amount }}</p>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex justify-between gap-5 mt-5">
            <div class="w-3/5 bg-white shadow-xl p-5 rounded-md">
                <header class="flex justify-between place-items-center">
                    <h3 class="text-xl mb-5">Transactions</h3>
                </header>
                <List :items="transactions">
                    <template #item="transaction">
                        <Transaction
                            :transaction="transaction"
                            :requiredConfirmations="
                                transaction.setup.confirmationThreshold
                            "
                            @confirm-transaction="handleTransactionConfirmation"
                        />
                    </template>
                </List>
            </div>
            <div class="w-3/5 bg-white shadow-xl p-5 rounded-md">
                <header class="mb-5 flex justify-between place-items-center">
                    <h2 class="text-xl mb-5s">Setup</h2>
                    <Button
                        class="text-xs h-8"
                        v-show="hasSetupChanged"
                        @click="proposeNewSetup"
                        >Propose setup's change</Button
                    >
                </header>
                <Setup
                    :voters="voters"
                    :requiredConfirmations="requiredConfirmations"
                    @new-voters="handleNewVoters"
                    @new-confirmation-threshold="handleNewConfirmationThreshold"
                />
            </div>
        </div>
        <div class="mt-5 bg-white shadow-xl p-5 rounded-md w-full">
            <header class="flex justify-between place-items-center">
                <h3 class="text-xl mb-5">Transaction builder</h3>
            </header>
            <TransactionFormVue
                @propose-transaction="handleProposeTransaction"
            />
        </div>
    </div>
</template>
