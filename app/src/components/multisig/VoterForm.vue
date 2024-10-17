<script setup lang="ts">
import { ref } from "vue";
import { Utils } from "@archethicjs/sdk";

const newVoterErrMsg = ref("");
const newVoterAddress = ref("");

const emit = defineEmits(["new-voter"]);

function addVoter() {
  const voterAddr = newVoterAddress.value;
  if (!Utils.isHex(voterAddr)) {
    newVoterErrMsg.value = "Invalid address";
    return;
  }
  newVoterErrMsg.value = "";
  emit("new-voter", voterAddr);
  newVoterAddress.value = "";
}
</script>

<template>
  <input
    class="outline-none p-1 border-b mb-2 text-sm w-full"
    v-model="newVoterAddress"
    placeholder="Enter new voter"
    @keyup.enter="addVoter"
  />
  <p class="text-sm text-red-800" v-show="newVoterErrMsg != ''">
    {{ newVoterErrMsg }}
  </p>
</template>
