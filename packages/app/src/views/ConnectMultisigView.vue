<script setup lang="ts">
import ConnectMultisig from "../components/ConnectMultisig.vue";
import Summary from "@/components/multisig/Summary.vue";

import { computed } from "vue";
import { useRouter, RouterLink } from "vue-router";
import { useVaultStore } from "@/stores/vaults";

const vaultStore = useVaultStore();
const router = useRouter();

const vaults = computed(() => vaultStore.getVaults());
const displayVaultListing = computed(() => vaults.value.length > 0);

function goToMultisig(multisig: string) {
  router.push({
    name: "app",
    params: {
      contractAddress: multisig,
    },
  });
}
</script>

<template>
  <div class="flex items-center justify-center h-screen">
    <div class="flex bg-white p-5 rounded-md mt-5 w-2/3">
      <div class="flex flex-col w-2/4" v-show="displayVaultListing">
        <p class="mb-5">Your vaults</p>
        <Summary v-for="vault in vaults" :vault="vault" class="mb-1" />
      </div>
      <div class="w-1 border-r mx-5" v-show="displayVaultListing"></div>
      <div class="w-2/4 flex flex-col">
        <ConnectMultisig @connect="goToMultisig" />
        <RouterLink to="/app/new" class="mt-5 text-sm text-slate-500 underline"
          >You need one, create it in few clicks</RouterLink
        >
      </div>
    </div>
  </div>
</template>
