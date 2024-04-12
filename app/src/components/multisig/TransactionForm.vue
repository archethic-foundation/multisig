<script setup>
defineEmits(["proposeTransaction"]);

import { ref, computed } from "vue";
import Button from "../Button.vue";
import List from "../List.vue";

const transaction = ref({
    ucoTransfers: [],
    tokenTransfers: [],
    contractCalls: [],
    code: "",
});

const showUcoTransferForm = ref(false);
const showTokenTransferForm = ref(false);
const showContractCallForm = ref(false);
const showContractCodeForm = ref(false);

const ucoRecipient = ref("");
const ucoAmount = ref(1);

const tokenRecipient = ref("");
const tokenAddress = ref("");
const tokenAmount = ref(1);

const contractRecipient = ref("");
const contractAction = ref("");
const contractArgs = ref([]);
const codeSrc = ref("");

const canProposeTransaction = computed(() => {
    return (
        transaction.value.ucoTransfers.length > 0 ||
        transaction.value.tokenTransfers.length > 0 ||
        transaction.value.contractCalls.length > 0 ||
        transaction.value.code != ""
    );
});

const formsChoices = {
    uco: showUcoTransferForm,
    token: showTokenTransferForm,
    contract: showContractCallForm,
    code: showContractCodeForm,
};

function pickForm(form) {
    showUcoTransferForm.value = false;
    showTokenTransferForm.value = false;
    showContractCallForm.value = false;
    showContractCodeForm.value = false;

    formsChoices[form].value = true;
}

function addUcoTransfer() {
    transaction.value.ucoTransfers.push({
        to: ucoRecipient.value,
        amount: ucoAmount.value,
    });
    ucoRecipient.value = "";
    ucoAmount.value = 1;
    showUcoTransferForm.value = false;
}

function addTokenTransfer() {
    transaction.value.tokenTransfers.push({
        to: tokenRecipient.value,
        tokenAddress: tokenAddress.value,
        amount: tokenAmount.value,
    });
    tokenRecipient.value = "";
    tokenAddress.value = "";
    tokenAmount.value = 1;
    showTokenTransferForm.value = false;
}

function addContractCall() {
    transaction.value.contractCalls.push({
        address: contractRecipient.value,
        action: contractAction.value,
        args: contractArgs.value,
    });
    contractRecipient.value = "";
    contractAction.value = "";
    contractArgs.value = [];
    showContractCallForm.value = false;
}

function setContractCode() {
    transaction.value.code = codeSrc.value;
    codeSrc.value = "";
    showContractCodeForm.value = false;
}

function uploadContractCode(fileList) {
    var reader = new FileReader();
    reader.onload = function (event) {
        codeSrc.value = reader.result;
    };
    reader.readAsText(fileList[0]);
}

function shortenAddress(address) {
    return `${address.slice(0, 8)}...${address.slice(address.length - 8)}`;
}

function removeUCOTransfer(transfer) {
    transaction.value.ucoTransfers = transaction.value.ucoTransfers.filter(
        (t) => {
            return !(t.to == transfer.to && t.amount == transfer.amount);
        },
    );
}

function removeTokenTransfer(transfer) {
    transaction.value.tokenTransfers = transaction.value.tokenTransfers.filter(
        (t) => {
            return !(
                t.to == transfer.to &&
                t.amount == transfer.amount &&
                t.tokenAddress == transfer.tokenAddress
            );
        },
    );
}

function removeContractCall(call) {
    transaction.value.contractCalls = transaction.value.contractCalls.filter(
        (c) => {
            return !(c.address == call.address && c.action != call.action);
        },
    );
}

function removeCode() {
    transaction.value.code = "";
}

function reset() {
    transaction.value = {
        ucoTransfers: [],
        tokenTransfers: [],
        contractCalls: [],
        code: "",
    };
}
</script>

<template>
    <div class="">
        <header class="flex place-items-center gap-5">
            <Button class="bg-slate-400 text-xs h-8" @click="pickForm('uco')"
                >Add UCO transfer</Button
            >
            <Button class="bg-slate-400 text-xs h-8" @click="pickForm('token')"
                >Add token transfer</Button
            >
            <Button
                class="bg-slate-400 text-xs h-8"
                @click="pickForm('contract')"
                >Add smart contract call</Button
            >
            <Button class="bg-slate-400 text-xs h-8" @click="pickForm('code')"
                >Set contract code</Button
            >
            <div class="flex-1"></div>
            <Button
                class="text-xs h-8"
                @click="$emit('proposeTransaction', transaction)"
                v-show="canProposeTransaction"
                >Propose transaction</Button
            >
            <Button
                class="text-xs h-8 bg-slate-500"
                @click="reset"
                v-show="canProposeTransaction"
                >Reset</Button
            >
        </header>

        <div class="mt-5 flex flex-col gap-5" v-show="showUcoTransferForm">
            <p class="text-xs text-slate-500">Add new UCO's transfer</p>
            <div>
                <label for="ucoRecipient" class="text-sm">Recipient</label>
                <input
                    class="outline-none text-sm w-full bg-transparent p-1 border-b"
                    placeholder="Enter recipient address"
                    v-model="ucoRecipient"
                    id="ucoRecipient"
                />
            </div>

            <div>
                <label for="ucoAmount" class="text-sm">Amount to send</label>
                <input
                    class="outline-none text-sm w-full bg-transparent p-1 border-b"
                    placeholder="Enter the amount of UCO"
                    type="number"
                    min="1"
                    step="1"
                    id="ucoAmount"
                    v-model="ucoAmount"
                />
            </div>

            <div>
                <Button class="text-xs h-8" @click="addUcoTransfer"
                    >Submit</Button
                >
            </div>
        </div>

        <div class="mt-5 flex flex-col gap-5" v-show="showTokenTransferForm">
            <p class="text-xs text-slate-500">Add new token's transfer</p>
            <div>
                <label for="tokenRecipient" class="text-sm">Recipient</label>
                <input
                    class="outline-none text-sm w-full bg-transparent p-1 border-b"
                    placeholder="Enter recipient address"
                    v-model="tokenRecipient"
                    id="tokenRecipient"
                />
            </div>

            <div>
                <label for="tokenAddress" class="text-sm"
                    >Token's address</label
                >
                <input
                    class="outline-none text-sm w-full bg-transparent p-1 border-b"
                    placeholder="Enter token's' address"
                    v-model="tokenAddress"
                    id="tokenAddress"
                />
            </div>

            <div>
                <label for="tokenAmount" class="text-sm">Amount to send</label>
                <input
                    class="outline-none text-sm w-full bg-transparent p-1 border-b"
                    placeholder="Enter the amount of token"
                    type="number"
                    min="1"
                    step="1"
                    id="tokenAmount"
                    v-model="tokenAmount"
                />
            </div>

            <div>
                <Button class="text-xs h-8" @click="addTokenTransfer"
                    >Submit</Button
                >
            </div>
        </div>

        <div class="mt-5 flex flex-col gap-5" v-show="showContractCallForm">
            <p class="text-xs text-slate-500">Add smart contract call</p>
            <div>
                <label for="contractRecipient" class="text-sm">Recipient</label>
                <input
                    class="outline-none text-sm w-full bg-transparent p-1 border-b"
                    placeholder="Enter recipient address"
                    v-model="contractRecipient"
                    id="contractRecipient"
                />
            </div>

            <div>
                <label for="contractAction" class="text-sm"
                    >Action's name</label
                >
                <input
                    class="outline-none text-sm w-full bg-transparent p-1 border-b"
                    placeholder="Enter contract's action"
                    v-model="contractAction"
                    id="contractAction"
                />
            </div>

            <div>
                <label for="contractArgs" class="text-sm"
                    >Arguments to pass</label
                >
                <input
                    class="outline-none text-sm w-full bg-transparent p-1 border-b"
                    placeholder="Enter the arguments"
                    type="text"
                    id="contractArgs"
                    v-model="contractArgs"
                />
            </div>

            <div>
                <Button class="text-xs h-8" @click="addContractCall"
                    >Submit</Button
                >
            </div>
        </div>

        <div class="mt-5 flex flex-col gap-5" v-show="showContractCodeForm">
            <p class="text-xs text-slate-500">Define contract's code</p>
            <div>
                <label for="codeSrc" class="text-sm">Code source file</label>
                <input
                    class="outline-none text-sm w-full bg-transparent p-1 border-b"
                    v-on:change="uploadContractCode($event.target.files)"
                    type="file"
                    id="codeSrc"
                />
            </div>

            <div>
                <Button class="text-xs h-8" @click="setContractCode"
                    >Submit</Button
                >
            </div>
        </div>

        <div class="mt-5">
            <div
                class="border-t pt-4 mt-2"
                v-show="transaction.ucoTransfers.length > 0"
            >
                <p class="text-xs text-slate-500 mb-2">UCO transfers</p>
                <div class="gap-5">
                    <List :items="transaction.ucoTransfers">
                        <template #item="transfer">
                            <div class="mb-2 flex">
                                <p
                                    class="text-sm content-center text-slate-500 w-1/4"
                                >
                                    Send {{ transfer.amount }} UCO to
                                    {{ shortenAddress(transfer.to) }}
                                </p>
                                <Button
                                    class="ml-5 text-xs h-8"
                                    @click="removeUCOTransfer(transfer)"
                                    >Remove</Button
                                >
                            </div>
                        </template>
                    </List>
                </div>
            </div>

            <div
                v-show="transaction.tokenTransfers.length > 0"
                class="border-t pt-4 mt-2"
            >
                <p class="text-xs text-slate-500 mb-2">Token transfers</p>
                <div class="gap-5">
                    <List :items="transaction.tokenTransfers">
                        <template #item="transfer">
                            <div class="mb-2 flex">
                                <p
                                    class="text-sm content-center text-slate-500 w-1/4"
                                >
                                    Send {{ transfer.amount }}
                                    {{ shortenAddress(transfer.tokenAddress) }}
                                    to
                                    {{ shortenAddress(transfer.to) }}
                                </p>
                                <Button
                                    class="ml-5 text-xs h-8"
                                    @click="removeTokenTransfer(transfer)"
                                    >Remove</Button
                                >
                            </div>
                        </template>
                    </List>
                </div>
            </div>

            <div
                v-show="transaction.contractCalls.length > 0"
                class="border-t pt-4 mt-2"
            >
                <p class="text-xs text-slate-500 mb-2">Contract calls</p>
                <div class="gap-5">
                    <List :items="transaction.contractCalls">
                        <template #item="call">
                            <div class="flex mb-2">
                                <p
                                    class="text-sm content-center text-slate-500 w-1/4"
                                >
                                    Execute
                                    <span class="font-bold">{{
                                        call.action
                                    }}</span>
                                    on {{ shortenAddress(call.address) }} with
                                    arguments:
                                    <code>{{ call.args }}</code>
                                </p>
                                <Button
                                    class="ml-5 text-xs h-8"
                                    @click="removeContractCall(call)"
                                    >Remove</Button
                                >
                            </div>
                        </template>
                    </List>
                </div>
            </div>

            <div v-show="transaction.code != ''" class="border-t pt-4 mt-2">
                <p class="text-xs text-slate-500 mb-2">Contract code</p>
                <div class="flex mb-2">
                    <p class="text-xs truncate content-center w-1/4">
                        {{ transaction.code }}
                    </p>
                    <Button class="ml-5 text-xs h-8" @click="removeCode()"
                        >Remove</Button
                    >
                </div>
            </div>
        </div>
    </div>
</template>
