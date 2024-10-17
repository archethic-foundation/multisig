<script setup lang="ts">
import { watch, type Ref, ref, computed  } from "vue";
import Header from "@/components/multisig/TransactionForm/Header.vue";

import UCOTransferInput from "@/components/multisig/TransactionForm/UCOTransferInput.vue";
import TokenTransferInput from "@/components/multisig/TransactionForm/TokenTransferInput.vue";
import ContractCallInput from "@/components/multisig/TransactionForm/ContractCallInput.vue";

import UCOTransferItem from "@/components/multisig/TransactionForm/UCOTransferItem.vue";
import TokenTransferItem from "@/components/multisig/TransactionForm/TokenTransferItem.vue";
import ContractCallItem from "@/components/multisig/TransactionForm/ContractCallItem.vue";

import Button from "../Button.vue";
import type { Recipient, TokenTransfer, TxData, UCOTransfer } from "@/types";
import type { Token } from "@archethicjs/sdk/dist/types";

const emit = defineEmits<{
  proposeTransaction: [transaction: TxData]
}>()


type token = Token & {
  address: string;
  amount: number;
  tokenId: number;
};

interface Props {
  pending: boolean;
  tokens: token[];
  toReset: boolean;
}

const props = defineProps<Props>();

const transaction: Ref<TxData> = ref({
  ucoTransfers: [],
  tokenTransfers: [],
  recipients: [],
  code: "",
  content: "",
});

const showUcoTransferForm = ref(false);
const showTokenTransferForm = ref(false);
const showContractCallForm = ref(false);
const showContractCodeForm = ref(false);
const showContentForm = ref(false);

const codeSrc = ref("");
const contentSrc = ref("");

const canProposeTransaction = computed(() => {
  return (
    transaction.value.ucoTransfers.length > 0 ||
    transaction.value.tokenTransfers.length > 0 ||
    transaction.value.recipients.length > 0 ||
    transaction.value.code != "" ||
    transaction.value.content != ""
  );
});

const formsChoices = {
  uco: showUcoTransferForm,
  token: showTokenTransferForm,
  contract: showContractCallForm,
  code: showContractCodeForm,
  content: showContentForm,
};

function pickForm(form: "uco" | "token" | "contract" | "code" | "content") {
  showUcoTransferForm.value = false;
  showTokenTransferForm.value = false;
  showContractCallForm.value = false;
  showContractCodeForm.value = false;
  showContentForm.value = false;

  formsChoices[form].value = true;
}

function addUcoTransfer(transfer: UCOTransfer) {
  transaction.value.ucoTransfers.push({
    to: transfer.to,
    amount: transfer.amount,
  });
  showUcoTransferForm.value = false;
}

function addTokenTransfer(transfer: TokenTransfer) {
  transaction.value.tokenTransfers.push({
    to: transfer.to,
    tokenAddress: transfer.tokenAddress,
    amount: transfer.amount,
  });
  showTokenTransferForm.value = false;
}

function addContractCall(contractCall: Recipient) {
  transaction.value.recipients.push({
    address: contractCall.address,
    action: contractCall.action,
    args: contractCall.args,
  });
  showContractCallForm.value = false;
}

function setContractCode() {
  transaction.value.code = codeSrc.value;
  codeSrc.value = "";
  showContractCodeForm.value = false;
}

function setContent() {
  transaction.value.content = contentSrc.value;
  contentSrc.value = "";
  showContentForm.value = false;
}

function uploadContractCode(fileList: FileList | null) {
  if (!fileList) return
  var reader = new FileReader();
  reader.onload = function (_event) {
    codeSrc.value = reader.result as string;
  };
  reader.readAsText(fileList[0]);
}

function uploadContent(fileList: FileList | null) {
  if (!fileList) return
  var reader = new FileReader();
  reader.onload = function (_event) {
    contentSrc.value = reader.result as string;
  };
  reader.readAsText(fileList[0]);
}

function removeUCOTransfer(transfer: UCOTransfer) {
  transaction.value.ucoTransfers = transaction.value.ucoTransfers.filter(
    (t) => {
      return !(t.to == transfer.to && t.amount == transfer.amount);
    },
  );
}

function removeTokenTransfer(transfer: TokenTransfer) {
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

function removeContractCall(call: Recipient) {
  transaction.value.recipients = transaction.value.recipients.filter(
    (c) => {
      return !(c.address == call.address && c.action == call.action);
    },
  );
}

function removeCode() {
  transaction.value.code = "";
}

function removeContent() {
  transaction.value.content = "";
}

function reset() {
  transaction.value = {
    ucoTransfers: [],
    tokenTransfers: [],
    recipients: [],
    code: "",
    content: "",
  };
}

watch(
  () => props.toReset,
  () => {
    reset();
  },
);
</script>

<template>
  <div class="">
    <Header
      :edited="canProposeTransaction"
      :pending="props.pending"
      @pickForm="pickForm"
      @proposeTransaction="$emit('proposeTransaction', transaction)"
      @reset="reset"
    />
    <div class="mt-5 flex flex-col gap-5" v-show="showUcoTransferForm">
      <UCOTransferInput @submit="addUcoTransfer" />
    </div>

    <div class="mt-5 flex flex-col gap-5" v-show="showTokenTransferForm">
      <TokenTransferInput :tokens="props.tokens" @submit="addTokenTransfer" />
    </div>

    <div class="mt-5 flex flex-col gap-5" v-show="showContentForm">
      <p class="text-xs text-slate-500">Define content</p>
      <div>
        <label for="contentSrc" class="text-sm">Content source file</label>
        <input
          class="outline-none text-sm w-full bg-transparent p-1 border-b"
          v-on:change="uploadContent(($event.target as HTMLInputElement).files)"
          type="file"
          id="contentSrc"
        />
      </div>

      <div>
        <Button class="text-xs h-8" @click="setContent">Submit</Button>
      </div>
    </div>

    <div class="mt-5 flex flex-col gap-5" v-show="showContractCallForm">
      <ContractCallInput @submit="addContractCall" />
    </div>

    <div class="mt-5 flex flex-col gap-5" v-show="showContractCodeForm">
      <p class="text-xs text-slate-500">Define contract's code</p>
      <div>
        <label for="codeSrc" class="text-sm">Code source file</label>
        <input
          class="outline-none text-sm w-full bg-transparent p-1 border-b"
          v-on:change="uploadContractCode(($event.target as HTMLInputElement).files)"
          type="file"
          id="codeSrc"
        />
      </div>

      <div>
        <Button class="text-xs h-8" @click="setContractCode">Submit</Button>
      </div>
    </div>

    <div class="mt-10">
      <div class="pt-5" v-show="transaction.ucoTransfers.length > 0">
        <p class="text-xs text-slate-500 mb-2">UCO transfers</p>
        <div class="gap-5">
          <div v-for="transfer in transaction.ucoTransfers">
            <div class="mb-2 flex">
              <UCOTransferItem :transfer="transfer" />
              <Button
                class="ml-5 text-xs h-8"
                @click="removeUCOTransfer(transfer)"
                >Remove</Button
              >
            </div>
          </div>
        </div>
      </div>

      <div v-show="transaction.tokenTransfers.length > 0" class="pt-5 mt-2">
        <p class="text-xs text-slate-500 mb-2">Token transfers</p>
        <div class="gap-5">
          <div v-for="transfer in transaction.tokenTransfers">
            <div class="mb-2 flex">
              <TokenTransferItem :transfer="transfer" />
              <Button
                class="ml-5 text-xs h-8"
                @click="removeTokenTransfer(transfer)"
                >Remove</Button
              >
            </div>
          </div>
        </div>
      </div>

      <div v-show="transaction.recipients.length > 0" class="pt-5 mt-2">
        <p class="text-xs text-slate-500 mb-2">Contract calls</p>
        <div class="gap-5">
          <div v-for="call in transaction.recipients">
            <div class="flex mb-2">
              <ContractCallItem :call="call" />
              <Button class="ml-5 text-xs h-8" @click="removeContractCall(call)"
                >Remove</Button
              >
            </div>
          </div>
        </div>
      </div>

      <div v-show="transaction.code != ''" class="pt-5 mt-2">
        <p class="text-xs text-slate-500 mb-2">Contract code</p>
        <div class="flex mb-2">
          <p class="text-xs truncate content-center w-1/4">
            {{ transaction.code }}
          </p>
          <Button class="ml-5 text-xs h-8" @click="removeCode()">Remove</Button>
        </div>
      </div>

      <div v-show="transaction.content.length > 0" class="pt-5 mt-2">
        <p class="text-xs text-slate-500 mb-2">Content</p>
        <div class="flex mb-2">
          <p class="text-xs truncate content-center w-1/4">
            {{ transaction.content }}
          </p>
          <Button class="ml-5 text-xs h-8" @click="removeContent()"
            >Remove</Button
          >
        </div>
      </div>
    </div>
  </div>
</template>
