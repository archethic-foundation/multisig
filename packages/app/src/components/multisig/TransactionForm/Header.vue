<script setup lang="ts">
import Button from "@/components/Button.vue";

type formType = "uco" | "token" | "contract" | "code" | "content"

defineEmits<({
  pickForm: [form: formType],
  proposeTransaction: []
  reset: []
})>()

interface Props {
  pending: boolean;
  edited: boolean;
}

const props = defineProps<Props>();
</script>

<template>
  <header class="flex place-items-center gap-5">
    <Button class="!bg-slate-400 h-9" @click="$emit('pickForm', 'uco')"
      >Add UCO transfer</Button
    >
    <Button class="!bg-slate-400 h-9" @click="$emit('pickForm', 'token')"
      >Add token transfer</Button
    >
    <Button class="!bg-slate-400 h-9" @click="$emit('pickForm', 'contract')"
      >Add smart contract call</Button
    >
    <Button class="!bg-slate-400 h-9" @click="$emit('pickForm', 'content')"
      >Set content</Button
    >
    <Button class="!bg-slate-400 h-9" @click="$emit('pickForm', 'code')"
      >Update vault's code</Button
    >
    <div class="flex-1"></div>
    <Button
      class="h-9"
      @click="$emit('proposeTransaction')"
      v-show="props.edited"
      :disabled="props.pending"
    >
      <span v-if="props.pending">Pending...</span>
      <span v-if="!props.pending">Propose transaction</span>
    </Button>
    <Button
      class="text-xs h-9 !bg-slate-500"
      @click="$emit('reset')"
      v-show="!props.pending && props.edited"
      >Reset</Button
    >
  </header>
</template>
