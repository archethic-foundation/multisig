<script setup lang="ts">
import { computed } from "vue";

interface Props {
  nbVoters?: number;
  selection?: number;
}

const { nbVoters = 1, selection = 1} = defineProps<Props>()

const options = computed(() => {
  let confirmations = [];
  const listSize = nbVoters > 1 ? nbVoters - 1 : 1;
  for (let i = 0; i < listSize; i++) {
    confirmations.push({
      value: i + 1,
      selected: selection == i + 1,
    });
  }
  return confirmations;
});

const emit = defineEmits(["set-required-confirmations"]);

function selectRequiredConfirmation(value: string) {
  emit("set-required-confirmations", parseInt(value));
}
</script>

<template>
  <label for="requiredConfirmations">Threshold signature confirmations:</label>
  <select
    class="p-2 outline-none"
    id="requiredConfirmations"
    v-on:change="selectRequiredConfirmation(($event.target as HTMLSelectElement).value)"
  >
    <option
      v-for="option in options"
      :value="option.value"
      class="p-2"
      :selected="option.selected"
    >
      {{ option.value }}
    </option>
  </select>
  <p class="text-xs text-slate-500 mt-1">
    Indicate how many signatures are required to fullfill a multisigned
    transaction apart from the transaction's initiator
  </p>
</template>
