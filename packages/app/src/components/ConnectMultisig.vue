<script setup lang="ts">
import { ref } from "vue";
import { Utils } from "@archethicjs/sdk";
import Warning from "@/components/Warning.vue";

import Button from "./Button.vue";

const emit = defineEmits(["connect"]);

const multisig = ref("");
const errMsg = ref("");

function connect() {
  if (!Utils.isHex(multisig.value)) {
    errMsg.value = "Invalid address";
    return;
  }
  errMsg.value = "";
  emit("connect", multisig.value);
}
</script>

<template>
  <h2 class="text-md text-slate-600">Access a vault</h2>
  <div class="flex flex-col">
    <input
      type="text"
      class="px-1 py-3 border-b text-slate bg-transparent border[#ddd] mt-5 outline-none text-sm"
      placeholder="Enter vault contract's address"
      v-model="multisig"
      @keyup.enter="connect"
    />
    <Warning v-show="errMsg != ''" class="mt-1">{{ errMsg }}</Warning>
    <div class="w-1/6 mt-5">
      <Button @click="connect">Connect</Button>
    </div>
  </div>
</template>
