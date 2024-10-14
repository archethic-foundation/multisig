<script setup>
const props = defineProps({
  name: {
    type: String,
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
});
</script>

<template>
  <div class="p-3 border rounded-md bg-slate-100 shadow-md">
    <p class="text-slate-800 font-bold">{{ props.name }}</p>
    <p class="text-slate-500 text-sm mt-1">{{ props.amount }}</p>
  </div>
</template>
