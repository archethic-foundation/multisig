<script setup>
import { ref, computed, watch } from "vue";
import { isValidAddress } from "@/utils";
import Warning from "@/components/Warning.vue";
import Button from "@/components/Button.vue";
import { Contract } from "@archethicjs/sdk";

import { useConnectionStore } from "@/stores/connection";

const emit = defineEmits(["submit"]);

const contractRecipient = ref("");
const contractAction = ref("");
const contractArgs = ref([]);
const errMsg = ref("");
const availableActions = ref([]);

const availableArgs = computed(() => {
  const action = availableActions.value.find(
    (a) => a.name == contractAction.value,
  );
  if (!action) {
    return [];
  }
  return action.parameters;
});

watch(availableArgs, () => {
  contractArgs.value = new Array(availableArgs.value.length);
});

const connectionStore = useConnectionStore();

function submit() {
  errMsg.value = "";
  if (!isValidAddress(contractRecipient.value)) {
    errMsg.value = "Invalid address";
    return;
  }

  emit("submit", {
    address: contractRecipient.value,
    action: contractAction.value,
    args: contractArgs.value.map((x) => Contract.parseTypedArgument(x)),
  });

  contractRecipient.value = "";
  contractAction.value = "";
  contractArgs.value = [];
}

async function fetchContractActions() {
  if (!isValidAddress(contractRecipient.value)) {
    return;
  }
  const archethic = connectionStore.connection;
  const res = await archethic.network.rawGraphQLQuery(`
    query {
	lastTransaction(address: "${contractRecipient.value}") {
        data{
			code
        }
      }
    }
  `);

  if (!res.lastTransaction) {
    return;
  }

  const code = res.lastTransaction.data.code;
  availableActions.value = Contract.extractActionsFromContract(code);
}
</script>
<template>
  <p class="text-xs text-slate-500">Add smart contract call</p>
  <div>
    <label for="contractRecipient" class="text-sm">Contract's address</label>
    <input
      class="outline-none text-sm w-full bg-transparent p-1 border-b mt-2"
      placeholder="Enter recipient address"
      v-model="contractRecipient"
      id="contractRecipient"
      @input="fetchContractActions"
    />
  </div>

  <div v-show="availableActions.length > 0">
    <label for="contractAction" class="text-sm">Action</label>
    <select
      id="contractAction"
      v-model="contractAction"
      class="p-2 outline-none text-sm text-slate-500"
    >
      <option value="">No action selected</option>
      <option v-for="action in availableActions">
        {{ action.name }}
      </option>
    </select>
  </div>

  <div v-show="contractAction != '' && availableArgs.length > 0">
    <label for="contractArgs" class="text-sm">Arguments</label>
    <div v-for="(arg, index) in availableArgs" class="p-1 text-sm flex">
      <label class="content-center flex-none">{{ arg }}</label>
      <input
        class="outline-none text-sm bg-transparent border-b p-3 rounded-md"
        type="text"
        :placeholder="arg"
        v-model="contractArgs[index]"
      />
    </div>
  </div>

  <Warning v-show="errMsg != ''">{{ errMsg }}</Warning>

  <div>
    <Button class="text-xs h-8" @click="submit">Submit</Button>
  </div>
</template>
