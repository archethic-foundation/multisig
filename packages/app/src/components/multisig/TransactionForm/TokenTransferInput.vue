<script setup lang="ts">
import { ref } from "vue";
import { isValidAddress, shortenAddress } from "@/utils";
import Warning from "@/components/Warning.vue";
import Button from "@/components/Button.vue";

const emit = defineEmits(["submit"]);

interface Token {
  name: string;
  address: string;
}

interface Props {
  tokens: Token[]
}

const { tokens } = defineProps<Props>()

const tokenRecipient = ref("");
const tokenAmount = ref(0);
const tokenAddress = ref("");
const errMsg = ref("");

function submit() {
  errMsg.value = "";
  if (!isValidAddress(tokenRecipient.value)) {
    errMsg.value = "Invalid address";
    return;
  }

  if (tokenAddress.value == "") {
    errMsg.value = "No tokens selected";
    return;
  }

  const amount = Number(tokenAmount.value);
  if (amount <= 0) {
    errMsg.value = "Invalid amount";
    return;
  }

  emit("submit", {
    to: tokenRecipient.value,
    amount: tokenAmount.value,
    tokenAddress: tokenAddress.value,
  });

  tokenRecipient.value = "";
  tokenAmount.value = 0;
  tokenAddress.value = "";
}
</script>
<template>
  <p class="text-xs text-slate-500">Add new Token's transfer</p>
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
    <label for="token" class="text-sm">Token to transfer: </label>
    <select
      v-model="tokenAddress"
      id="token"
      class="p-2 outline-none w-96 text-sm text-slate-500"
    >
      <option value="">Select token</option>
      <option v-for="token in tokens" :value="token.address" class="p-2">
        {{ token.name }} ({{ shortenAddress(token.address) }})
      </option>
    </select>
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

  <Warning v-show="errMsg != ''">{{ errMsg }}</Warning>

  <div>
    <Button @click="submit">Submit</Button>
  </div>
</template>
