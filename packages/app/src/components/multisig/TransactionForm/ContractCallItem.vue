<script setup lang="ts">
import type { Recipient } from "@/types";
import { shortenAddress } from "@/utils";

interface Props {
  call: Recipient
}

const props = defineProps<Props>();
</script>

<template>
  <p class="text-sm content-center text-slate-500 w-1/4">
    Execute
    <span class="font-bold">{{ props.call.action }}</span>
    on {{ shortenAddress(props.call.address) }} with arguments:
    <code>{{ props.call.args }}</code>
  </p>
</template>
