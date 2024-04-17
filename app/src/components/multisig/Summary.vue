<script setup>
import { RouterLink } from "vue-router";
import { shortenAddress } from "@/utils";

const props = defineProps({
    vault: {
        type: Object,
        required: true,
    },
});
</script>

<template>
    <div class="">
        <RouterLink
            :to="`/app/${props.vault.address}`"
            class="text-sm text-slate-500 border p-3 rounded-md bg-slate-100 hover:bg-slate-200 flex"
            >{{
                props.vault.name || shortenAddress(props.vault.address)
            }}</RouterLink
        >
    </div>
</template>
