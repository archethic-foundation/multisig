<script setup>
import { shortenAddress } from "@/utils";

const props = defineProps({
    ucoBalance: {
        type: Number,
        default: 0,
    },
    tokenBalance: {
        type: Array,
        default: [],
    },
});
</script>

<template>
    <div class="flex-col">
        <div class="flex">
            <p class="text-slate-500">UCO</p>
            <p class="text-slate-500 ml-3">{{ props.ucoBalance }}</p>
        </div>
        <div v-for="token in props.tokenBalance" class="flex mt-2">
            <p class="text-slate-500">
                Token {{ shortenAddress(token.address) }}
            </p>
            <p class="text-slate-500 ml-3">{{ token.amount }}</p>
        </div>
    </div>
</template>
