<script setup>
import { shortenAddress } from "@/utils";

const props = defineProps({
    transfer: {
        type: Object,
        required: true,
    },
});
</script>

<template>
    <p class="text-sm content-center text-slate-500 w-1/4">
        Send {{ props.transfer.amount }} UCO to
        {{ shortenAddress(props.transfer.to) }}
    </p>
</template>
