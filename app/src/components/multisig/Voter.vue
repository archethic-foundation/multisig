<script setup>
import { computed } from "vue";
import Button from "../Button.vue";

const props = defineProps({
    voter: {
        type: Object,
        required: true,
    },
});

function shortenAddress(address) {
    return `${address.slice(0, 8)}...${address.slice(address.length - 8)}`;
}

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
            >Remove</Button
        >
    </div>
</template>
