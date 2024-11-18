<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { shortenAddress } from "@/utils";
import type { Vault } from "@/stores/vaults";

interface Props {
  vault: Vault;
}

const { vault } = defineProps<Props>();

const vaultTile = computed(() => {
  return vault.name
    ? `${vault.name}(${shortenAddress(vault.address)})`
    : shortenAddress(vault.address);
});
</script>

<template>
  <RouterLink
    :to="`/app/${vault.address}`"
    class="text-sm text-slate-500 border p-3 rounded-md bg-slate-100 hover:bg-slate-200 flex justify-between"
    >{{ vaultTile }}
  </RouterLink>
</template>
