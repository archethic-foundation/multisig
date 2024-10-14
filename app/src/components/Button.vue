<script setup>
import { computed } from "vue";
const props = defineProps({
  disabled: {
    type: Boolean,
    default: false,
  },
});

const styleClass = computed(() => {
  if (props.disabled) {
    return "bg-slate-500 h-8 cursor-not-allowed";
  }
  return "bg-violet-600 h-8 hover:bg-violet-700";
});
</script>

<template>
  <button
    :class="`h-8 text-xs rounded-md px-3 py-2 text-white ${styleClass}`"
    :disabled="props.disabled"
  >
    <slot></slot>
  </button>
</template>
