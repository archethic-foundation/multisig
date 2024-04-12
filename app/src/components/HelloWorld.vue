<script setup>
defineProps({
    msg: {
        type: String,
        required: true
    }
})
</script>

<template>
    <div class="">
        <h1 class="font-weight-medium text-5xl text-slate-300">{{ msg }}</h1>
    </div>
</template>
