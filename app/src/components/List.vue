<script setup>
defineProps({
    items: {
        type: Array,
        required: true
    }
})
</script>

<template>
    <div v-for="item in items">
        <slot name="item" v-bind="item"></slot>
    </div>
</template>
