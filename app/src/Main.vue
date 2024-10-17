<script setup="ts">
import { ref, onMounted, computed } from "vue";
import { RouterView, useRouter, RouterLink } from "vue-router";

import { useConnectionStore } from "@/stores/connection";
import Button from "./components/Button.vue";

const connectionStore = useConnectionStore();
const isConnected = computed(() => connectionStore.isConnected);
const accountAddress = computed(() => connectionStore.accountAddress);
const accountName = computed(() => connectionStore.accountName);

const connectedNetwork = computed(() => {
  if (!connectionStore.endpoint) {
    return;
  }

  const endpointHostname = new URL(connectionStore.endpoint).hostname;
  if (endpointHostname.startsWith("mainnet")) {
    return "MainNet";
  }
  if (endpointHostname.startsWith("testnet")) {
    return "TestNet";
  }

  return "PrivateNet";
});
const route = useRouter();

const displayConnectionBar = computed(() => {
  if (route.currentRoute.value.name == "home") {
    return false;
  }
  return true;
});

function shortenAddress(address) {
  return `${address.slice(0, 8)}...${address.slice(address.length - 8)}`;
}

function connectWallet() {
  connectionStore.connect();
}

onMounted(async () => {
  const connectionStore = useConnectionStore();
  await connectionStore.connect();
});
</script>

<template>
  <header
    class="text-slate-300 flex px-5 py-3 bg-slate-100/10"
    v-show="displayConnectionBar"
  >
    <RouterLink class="text-slate-200 uppercase tracking-widest" to="/app"
      >AEVault</RouterLink
    >
    <div class="flex-1"></div>
    <div class="text-sm">
      <Button v-show="!isConnected" @click="connectWallet"
        >Connect wallet</Button
      >
      <p v-show="isConnected">
        Connected as <span class="uppercase">{{ accountName }}</span
        >(<span class="text-xs">{{ shortenAddress(accountAddress) }}</span
        >) on
        <a :href="connectionStore.endpoint" target="_blank">{{
          connectedNetwork
        }}</a>
      </p>
    </div>
  </header>
  <RouterView />
</template>
