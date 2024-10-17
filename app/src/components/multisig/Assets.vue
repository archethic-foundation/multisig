<script setup lang="ts">
import Asset from "@/components/multisig/Asset.vue";
import type { Balance } from "./types";

interface Props {
  balance: Balance
}

const { balance = { uco: 0, tokens: [] }} = defineProps<Props>();
</script>

<template>
  <div class="grid grid-cols-10 gap-3">
    <Asset name="UCO" :amount="balance.uco" />
    <Asset
      :name="`${token.name} (${token.symbol})`"
      :amount="token.amount"
      v-for="token in balance.tokens"
    />
  </div>
</template>
