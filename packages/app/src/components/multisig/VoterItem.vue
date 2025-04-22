<script setup>
import Button from "../Button.vue";
import Address from "../Address.vue";

const props = defineProps({
    voter: {
        type: String,
        required: true,
    },
    removable: { type: Boolean, required: false, default: true },
});

defineEmits(["remove-voter"]);
</script>

<template>
    <div class="flex text-slate-700">
        <p class="text-sm content-center truncate w-1/3">
            <Address :address="voter" chain />
        </p>
        <Button
            class="ml-5 bg-slate-500"
            @click="$emit('remove-voter', voter)"
            v-show="removable"
            >Remove</Button
        >
    </div>
</template>
