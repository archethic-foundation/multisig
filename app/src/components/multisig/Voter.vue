<script setup>
import Button from "../Button.vue";
import { shortenAddress } from "@/utils";

const props = defineProps({
    voter: {
        type: Object,
        required: true,
    },
});

defineEmits(["remove-voter"]);
</script>

<template>
    <div class="flex text-slate-700">
        <p class="text-sm content-center truncate w-1/3">
            {{ shortenAddress(voter.address) }}
            <span v-show="voter.name">({{ voter.name }})</span>
        </p>
        <Button
            class="ml-5 bg-slate-500"
            @click="$emit('remove-voter', voter.address)"
            v-show="voter.removable"
            >Remove</Button
        >
    </div>
</template>
