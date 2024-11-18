<script setup lang="ts">
import type { UCOTransfer } from "@/types";
import { shortenAddress } from "@/utils";

interface Props {
  transfer: UCOTransfer
}

const props = defineProps<Props>();
</script>

<template>
  <p class="text-sm content-center text-slate-500 w-1/4">
    Send {{ props.transfer.amount }} UCO to
    {{ shortenAddress(props.transfer.to) }}
  </p>
</template>
