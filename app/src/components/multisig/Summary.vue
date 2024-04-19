<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { shortenAddress } from "@/utils";

const props = defineProps({
    vault: {
        type: Object,
        required: true,
    },
});

const vaultTile = computed(() => {
    return props.vault.name
        ? `${props.vault.name} (${shortenAddress(props.vault.address)})`
        : shortenAddress(props.vault.address);
});
</script>

<template>
    <RouterLink
        :to="`/app/${props.vault.address}`"
        class="text-sm text-slate-500 border p-3 rounded-md bg-slate-100 hover:bg-slate-200 flex justify-between"
        >{{ vaultTile }}
    </RouterLink>
</template>
