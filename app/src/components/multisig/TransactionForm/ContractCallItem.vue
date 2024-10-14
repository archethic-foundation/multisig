<script setup>
import { shortenAddress } from "@/utils";

const props = defineProps({
  call: {
    type: Object,
    required: true,
  },
});
</script>

<template>
  <p class="text-sm content-center text-slate-500 w-1/4">
    Execute
    <span class="font-bold">{{ props.call.action }}</span>
    on {{ shortenAddress(prpops.call.address) }} with arguments:
    <code>{{ props.call.args }}</code>
  </p>
</template>
