<script setup>
import { shortenAddress } from "@/utils";
import Asset from "@/components/multisig/Asset.vue";

const props = defineProps({
    balance: {
        type: Object,
        default: {
            uco: 0,
            tokens: [],
        },
    },
});
</script>

<template>
    <div class="grid grid-cols-10 gap-3">
        <Asset name="UCO" :amount="props.balance.uco" />
        <Asset
            :name="`${token.name} (${token.symbol})`"
            :amount="token.amount"
            v-for="token in props.balance.tokens"
        />
    </div>
</template>
