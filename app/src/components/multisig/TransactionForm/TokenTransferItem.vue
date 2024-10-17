<script setup lang="ts">
import type { TokenTransfer } from "@/types";
import { shortenAddress } from "@/utils";

interface Props {
  transfer: TokenTransfer
}

const props = defineProps<Props>();
</script>

<template>
  <p class="text-sm content-center text-slate-500 w-1/4">
    Send {{ props.transfer.amount }}
    {{ shortenAddress(props.transfer.tokenAddress) }}
    to
    {{ shortenAddress(props.transfer.to) }}
  </p>
</template>
