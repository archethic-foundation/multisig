<script setup>
import { computed, ref } from "vue";

const props = defineProps({
  nbVoters: {
    type: Number,
    default: 1,
  },
  selection: {
    type: Number,
    default: 1,
  },
});

const options = computed(() => {
  let confirmations = [];
  const listSize = props.nbVoters > 1 ? props.nbVoters - 1 : 1;
  for (let i = 0; i < listSize; i++) {
    confirmations.push({
      value: i + 1,
      selected: props.selection == i + 1,
    });
  }
  return confirmations;
});

const emit = defineEmits(["set-required-confirmations"]);

function selectRequiredConfirmation(value) {
  emit("set-required-confirmations", parseInt(event.target.value));
}
</script>

<template>
  <label for="requiredConfirmations">Threshold signature confirmations:</label>
  <select
    class="p-2 outline-none"
    id="requiredConfirmations"
    @change="selectRequiredConfirmation"
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
