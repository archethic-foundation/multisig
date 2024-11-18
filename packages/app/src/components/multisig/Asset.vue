<script setup lang="ts">

interface Props {
  name: string;
  amount: number;
}

const { name, amount } = defineProps<Props>();
</script>

<template>
  <div class="p-3 border rounded-md bg-slate-100 shadow-md">
    <p class="text-slate-800 font-bold">{{ name }}</p>
    <p class="text-slate-500 text-sm mt-1">{{ amount }}</p>
  </div>
</template>
