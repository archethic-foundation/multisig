<script setup>
import { computed, ref, watchEffect } from "vue";
import Button from "../Button.vue";
import { shortenAddress } from "@/utils";
import { Utils } from "@archethicjs/sdk";

const props = defineProps({
    transaction: {
        type: Object,
        required: true,
    },
    requiredConfirmations: {
        type: Number,
        required: true,
    },
    nbVoters: {
        type: Number,
        required: true,
    },
    pendingConfirmation: {
        type: Boolean,
        default: false,
    },
});

import { useConnectionStore } from "@/stores/connection";
const connectionStore = useConnectionStore();

const nbApprovals = computed(() => {
    return props.transaction.confirmations.length;
});
const showDetails = ref(false);
const resolvedTokens = ref([]);

const toBeConfirmed = ref(false);

watchEffect(async () => {
    const archethic = connectionStore.connection;
    const confirmationsGenesisAddresses = await Promise.all(
        props.transaction.confirmations.map(async (confirmation) => {
            const res = await archethic.network.rawGraphQLQuery(
                `query{ genesisAddress(address: "${confirmation}") }`,
            );
            return res.genesisAddress;
        }),
    );

    const currentAddress = connectionStore.accountAddress.toUpperCase();

    const eligibleToVote =
        props.nbVoters > 1 ? props.transaction.from != currentAddress : true;
    const alreadyVoted = confirmationsGenesisAddresses.includes(currentAddress);

    const confirmation =
        props.transaction.status == "pending" &&
        eligibleToVote &&
        !alreadyVoted;

    toBeConfirmed.value = confirmation;

    resolvedTokens.value = await Promise.all(
        props.transaction.tokenTransfers.map(
            async ({ to, amount, tokenAddress }) => {
                const res = await archethic.network.rawGraphQLQuery(
                    `query {
            token(address: "${tokenAddress}") { name }
          }`,
                );
                if (res.token) {
                    return {
                        to,
                        tokenAddress,
                        amount,
                        tokenName: res.token.name,
                    };
                }
                return { to, tokenAddress, amount };
            },
        ),
    );
});

const confirmations = computed(() => {
    return props.transaction.confirmations.map((confirmationAddress) => {
        return {
            address: confirmationAddress,
            url: `${connectionStore.endpoint}/explorer/transaction/${confirmationAddress}`,
        };
    });
});

const emit = defineEmits(["confirm-transaction"]);

function confirmTransaction() {
    emit("confirm-transaction", props.transaction.id);
}
</script>

<template>
    <div class="flex flex-col pl-5 pt-2 pb-2 text-slate-700 border-b">
        <div class="flex gap-5">
            <p class="text-sm content-center">#{{ transaction.id }}</p>
            <span class="text-sm rounded-md p-1 content-center w-40"
                >Status: {{ transaction.status }}</span
            >
            <p class="text-sm content-center">
                Confirmations {{ nbApprovals }} /
                {{ requiredConfirmations }}
            </p>
            <div class="flex gap-2">
                <Button
                    class="w-25 text-xs h-8 bg-slate-500"
                    @click="showDetails = true"
                    v-show="!showDetails"
                    >Details</Button
                >
                <Button
                    class="w-25 text-xs h-8 bg-slate-500"
                    @click="showDetails = false"
                    v-show="showDetails"
                    >Hide details</Button
                >

                <Button
                    class="w-24 text-xs h-8"
                    v-show="toBeConfirmed"
                    @click="confirmTransaction"
                    :disabled="props.pendingConfirmation"
                >
                    <span v-show="!props.pendingConfirmation">Confirm</span>
                    <span v-show="props.pendingConfirmation"
                        >Confirming...</span
                    ></Button
                >
            </div>
        </div>

        <div v-show="showDetails">
            <div class="mt-2 flex flex-col gap">
                <div v-for="transfer in transaction.ucoTransfers">
                    <p class="mb-2 text-xs content-center text-slate-500">
                        <span
                            >Send {{ transfer.amount }}
                            <span class="font-bold">UCO</span> to</span
                        >
                        <span class="ml-1"
                            >{{ shortenAddress(transfer.to) }}
                        </span>
                    </p>
                </div>

                <div v-for="transfer in resolvedTokens">
                    <div class="flex">
                        <p class="mb-2 text-xs content-center text-slate-500">
                            <span
                                >Send {{ transfer.amount }}
                                <span class="font-bold">{{
                                    transfer.tokenName
                                }}</span>
                                ({{ shortenAddress(transfer.tokenAddress) }})
                                to</span
                            >
                            <span class="ml-1"
                                >{{ shortenAddress(transfer.to) }}
                            </span>
                        </p>
                    </div>
                </div>

                <div v-for="call in transaction.recipients">
                    <div class="flex">
                        <p class="text-xs content-center text-slate-500">
                            Execute
                            <span class="font-bold">{{ call.action }}</span>
                            on {{ shortenAddress(call.address) }} with
                            arguments:
                            <code>{{ call.args }}</code>
                        </p>
                    </div>
                </div>

                <div v-show="transaction.code != ''">
                    <p class="text-xs text-slate-500 mb-2">Contract code</p>
                    <pre class="text-xs truncate">{{
                        shortenAddress(transaction.code)
                    }}</pre>
                </div>

                <div
                    v-show="
                        transaction.newVoters &&
                        transaction.newVoters.length > 0
                    "
                >
                    <div v-for="voter in transaction.newVoters">
                        <p class="mb-2 text-xs content-center text-slate-500">
                            <span
                                >Authorize voter
                                {{ shortenAddress(voter.address) }}
                            </span>
                        </p>
                    </div>
                </div>

                <div v-for="voter in transaction.removedVoters">
                    <p class="mb-2 text-xs content-center text-slate-500">
                        <span
                            >Remove voter
                            {{ shortenAddress(voter.address) }}
                        </span>
                    </p>
                </div>

                <div v-show="transaction.newThreshold">
                    <p class="text-xs text-slate-500 mb-2">
                        New confirmation threshold:
                        {{ transaction.newThreshold }}
                    </p>
                </div>
            </div>

            <div class="mt-2 flex-col gap mt-5" v-if="confirmations.length > 0">
                <p class="text-xs mb-2">Confirmations</p>
                <p
                    class="text-xs text-slate-500"
                    v-for="confirmation in confirmations"
                >
                    Transaction:
                    <a :href="confirmation.url" target="_blank">{{
                        shortenAddress(confirmation.address)
                    }}</a>
                </p>
            </div>
        </div>
    </div>
</template>
