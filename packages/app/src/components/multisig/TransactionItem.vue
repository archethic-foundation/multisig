<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import Button from "../Button.vue";
import Address from "../Address.vue";

interface Props {
    transaction: Transaction;
    requiredConfirmations: number;
    nbVoters: number;
    pendingConfirmation: boolean;
}

const props = defineProps<Props>();

import { useConnectionStore } from "@/stores/connection";
import type { TokenTransfer, Transaction } from "@/types";
import type { Token } from "@archethicjs/sdk/dist/types";
const connectionStore = useConnectionStore();

const nbApprovals = computed(() => {
    return props.transaction.confirmations.length;
});
const showDetails = ref(false);

type ResolvedTokenTransfer = TokenTransfer & {
    tokenName?: string;
}

const resolvedTokens = ref([] as ResolvedTokenTransfer[]);

const currentAddress = connectionStore.accountAddress.toUpperCase();
const toBeConfirmed = computed(() => {
    const eligibleToVote = props.requiredConfirmations > 1 ? props.transaction.from != currentAddress : true;
    return props.transaction.status == "pending" && eligibleToVote
})

const alreadyVoted = ref(false)

watchEffect(async () => {
    const archethic = connectionStore.connection;
    const confirmationsGenesisAddresses = await Promise.all(
        props.transaction.confirmations.map(async (confirmation: any) => {
            const address = confirmation.confirmationAddress
            const res = await archethic?.network.rawGraphQLQuery(
                `query{ genesisAddress(address: "${address}") }`,
            );
            return res.genesisAddress;
        })
    );

    alreadyVoted.value = confirmationsGenesisAddresses.includes(currentAddress);

    if (props.transaction.txData) {
        resolvedTokens.value = !props.transaction.txData.tokenTransfers ? [] : await Promise.all(props.transaction.txData.tokenTransfers.map(async (token: TokenTransfer) => {
            const tokenDetails = await archethic?.network.getToken(token.tokenAddress) as Token;
            return {
                to: token.to,
                tokenAddress: token.tokenAddress,
                amount: token.amount,
                tokenName: tokenDetails.name,
            };
        }))
    }
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
                    <span v-show="props.pendingConfirmation">Confirming...</span>
                </Button
                >
            </div>
        </div>

        <div v-show="showDetails">
            <div class="mt-2 flex flex-col gap">
                <div v-for="transfer in transaction.txData?.ucoTransfers">
                    <p class="mb-2 text-xs content-center text-slate-500">
                        <span
                            >Send {{ transfer.amount }}
                            <span class="font-bold">UCO</span> to</span
                        >
                        <span class="ml-1"
                            ><Address :address="transfer.to" chain />
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
                                (<Address :address="transfer.tokenAddress" />)
                                to</span
                            >
                            
                            <span class="ml-1"
                                >
                                <Address :address="transfer.to" chain/>
                            </span>
                        </p>
                    </div>
                </div>

                <div v-for="call in transaction.txData?.recipients">
                    <div class="flex">
                        <p class="text-xs content-center text-slate-500">
                            Execute
                            <span class="font-bold">{{ call.action }}</span>
                            on <Address :address="call.address" /> with
                            arguments:
                            <code>{{ call.args }}</code>
                        </p>
                    </div>
                </div>

                <div v-show="transaction.txData?.contract != undefined">
                    <p class="text-xs text-slate-500 mb-2">New contract code</p>
                </div>

                <div v-show="transaction.txData?.content != ''">
                    <p class="text-xs text-slate-500 mb-2">Content</p>
                    <pre class="text-xs truncate">{{
                        transaction.txData?.content
                    }}</pre>
                </div>

                <div
                    v-show="
                        transaction.setup?.newVoters &&
                        transaction.setup?.newVoters.length > 0
                    "
                >
                    <div v-for="voter in transaction.setup?.newVoters">
                        <p class="mb-2 text-xs content-center text-slate-500">
                            <span
                                >Authorize voter
                                <Address :address="voter" chain/>
                            </span>
                        </p>
                    </div>
                </div>
                <div v-if="transaction.setup" >
                    <div v-for="voter in transaction.setup.removedVoters">
                        <p class="mb-2 text-xs content-center text-slate-500">
                            <span
                                >Remove voter
                                <Address :address="voter" chain/>
                            </span>
                        </p>
                    </div>
    
                    <div v-show="transaction.setup.newThreshold">
                        <p class="text-xs text-slate-500 mb-2">
                            New confirmation threshold:
                            {{ transaction.setup.newThreshold }}
                        </p>
                    </div>
                </div>
            </div>

            <div class="mt-2 flex-col gap mt-5" v-if="props.transaction.confirmations.length > 0">
                <p class="text-xs mb-2">Confirmations</p>
                <p
                    class="text-xs text-slate-500"
                    v-for="confirmation in props.transaction.confirmations"
                >
                    <Address :address="confirmation.confirmationAddress" />
                </p>
            </div>
        </div>
    </div>
</template>
