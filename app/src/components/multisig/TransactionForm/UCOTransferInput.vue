<script setup>
import { ref } from "vue";
import { isValidAddress } from "@/utils";
import Warning from "@/components/Warning.vue";
import Button from "@/components/Button.vue";

const emit = defineEmits(["submit"]);

const ucoRecipient = ref("");
const ucoAmount = ref(0);
const errMsg = ref("");

function submit() {
  errMsg.value = "";
  if (!isValidAddress(ucoRecipient.value)) {
    errMsg.value = "Invalid address";
    return;
  }

  const amount = Number(ucoAmount.value);
  if (amount == NaN || amount <= 0) {
    errMsg.value = "Invalid amount";
    return;
  }

  emit("submit", {
    to: ucoRecipient.value,
    amount: ucoAmount.value,
  });

  ucoRecipient.value = "";
  ucoAmount.value = "";
}
</script>
<template>
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

  <Warning v-show="errMsg != ''">{{ errMsg }}</Warning>

  <div>
    <Button @click="submit">Submit</Button>
  </div>
</template>
