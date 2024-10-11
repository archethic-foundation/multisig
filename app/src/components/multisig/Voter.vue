<script setup>
import Button from "../Button.vue";
import Address from "../Address.vue";

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
            <Address :address="voter.address" chain />
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
