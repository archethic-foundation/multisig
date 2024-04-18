<script setup>
import Assets from "@/components/multisig/Assets.vue";
import Loading from "@/components/Loading.vue";

const props = defineProps({
    address: {
        type: String,
        required: true,
    },
    endpoint: {
        type: String,
        required: true,
    },
    loading: {
        type: Boolean,
        default: false,
    },
    balance: {
        type: Object,
        required: true,
    },
});
</script>

<template>
    <h2 class="text-xl text-slate-600 mb-10">
        Vault's address:
        <a
            :href="`${props.endpoint}/explorer/chain?address=${props.address}`"
            target="_blank"
            >{{ props.address }}</a
        >
    </h2>
    <Loading v-if="props.loading" />
    <div v-show="!props.loading">
        <p class="mt-10 mb-2 text-slate-500">Assets</p>
        <Assets :balance="props.balance" />
    </div>
</template>
