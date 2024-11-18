<script setup lang="ts">
import { shortenAddress, explorerLink } from "@/utils";
import { useConnectionStore } from "@/stores/connection";

const connectionStore = useConnectionStore();

const props = defineProps({
  address: {
    type: String,
    required: true,
  },
  chain: {
    type: Boolean,
    default: false,
  },
});

</script>
<template>
  <a
    :href="explorerLink(connectionStore.endpoint, props.address, props.chain)"
    target="_blank"
    v-if="connectionStore.isConnected"
    >{{ shortenAddress(props.address) }}</a
  >
  <span v-if="!connectionStore.isConnected">{{ shortenAddress(props.address) }}</span>
</template>
