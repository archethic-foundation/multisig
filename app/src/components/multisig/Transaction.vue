<script setup>
import { computed, ref, watchEffect } from "vue";
import Button from "../Button.vue";
import List from "../List.vue";

const props = defineProps({
    transaction: {
        type: Object,
        required: true,
    },
    requiredConfirmations: {
        type: Number,
        required: true,
    },
});

import { useConnectionStore } from "@/stores/connection";
const connectionStore = useConnectionStore();

const nbApprovals = computed(() => {
    return props.transaction.confirmations.length;
});
const showDetails = ref(false);

function shortenAddress(address) {
    return `${address.slice(0, 8)}...${address.slice(address.length - 8)}`;
}

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

    const confirmation =
        props.transaction.from != currentAddress &&
        props.transaction.status == "pending" &&
        !confirmationsGenesisAddresses.includes(currentAddress);

    toBeConfirmed.value = confirmation;
});

const confirmations = computed(() => {
    return props.transaction.confirmations.map((confirmationAddress) => {
        return {
            address: confirmationAddress,
            url: `${connectionStore.endpoint}/explorer/transaction/${confirmationAddress}`,
        };
    });
});

defineEmits(["confirm-transaction"]);
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
                    class="w-20 text-xs h-8"
                    v-show="toBeConfirmed"
                    @click="$emit('confirm-transaction', transaction.id)"
                    >Confirm</Button
                >
            </div>
        </div>

        <div v-show="showDetails">
            <div class="mt-2 flex flex-col gap">
                <div
                    v-show="
                        transaction.ucoTransfers &&
                        transaction.ucoTransfers.length > 0
                    "
                >
                    <List :items="transaction.ucoTransfers">
                        <template #item="transfer">
                            <p
                                class="mb-2 text-xs content-center text-slate-500"
                            >
                                <span>Send {{ transfer.amount }} UCO to</span>
                                <span class="ml-1"
                                    >{{ shortenAddress(transfer.to) }}
                                </span>
                            </p>
                        </template>
                    </List>
                </div>

                <div
                    v-show="
                        transaction.tokenTransfers &&
                        transaction.tokenTransfers.length > 0
                    "
                >
                    <List :items="transaction.tokenTransfers">
                        <template #item="transfer">
                            <div class="flex">
                                <p
                                    class="mb-2 text-xs content-center text-slate-500"
                                >
                                    <span
                                        >Send {{ transfer.amount }} token (
                                        shortenAddress(transfer.token_address))
                                        to</span
                                    >
                                    <span class="ml-1"
                                        >{{ shortenAddress(transfer.to) }}
                                    </span>
                                </p>
                            </div>
                        </template>
                    </List>
                </div>

                <div
                    v-show="
                        transaction.recipients &&
                        transaction.recipients.length > 0
                    "
                >
                    <List :items="transaction.recipients">
                        <template #item="call">
                            <div class="flex">
                                <p
                                    class="text-xs content-center text-slate-500"
                                >
                                    Execute
                                    <span class="font-bold">{{
                                        call.action
                                    }}</span>
                                    on {{ shortenAddress(call.address) }} with
                                    arguments:
                                    <code>{{ call.args }}</code>
                                </p>
                            </div>
                        </template>
                    </List>
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
                    <List :items="transaction.newVoters">
                        <template #item="voter">
                            <p
                                class="mb-2 text-xs content-center text-slate-500"
                            >
                                <span
                                    >Authorize voter
                                    {{ shortenAddress(voter.address) }}
                                </span>
                            </p>
                        </template>
                    </List>
                </div>

                <div
                    v-show="
                        transaction.removedVoters &&
                        transaction.removedVoters.length > 0
                    "
                >
                    <List :items="transaction.removedVoters">
                        <template #item="voter">
                            <p
                                class="mb-2 text-xs content-center text-slate-500"
                            >
                                <span
                                    >Remove voter
                                    {{ shortenAddress(voter.address) }}
                                </span>
                            </p>
                        </template>
                    </List>
                </div>

                <div v-show="transaction.newThreshold">
                    <p class="text-xs text-slate-500 mb-2">
                        New confirmation threshold:
                        {{ transaction.newThreshold }}
                    </p>
                </div>
            </div>

            <div class="mt-2 flex-col gap mt-5">
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
