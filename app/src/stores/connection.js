import { ref, computed } from "vue";
import { defineStore } from "pinia";

import Archethic from "@archethicjs/sdk";

export const useConnectionStore = defineStore("connection", () => {
  const connection = ref(undefined);
  const isConnected = computed(() => {
    return connection.value != undefined;
  });
  const accountAddress = ref("");
  const accountName = ref("");
  const endpoint = ref("");

  async function connect() {
    if (isConnected.value) {
      return connection.value;
    }
    try {
      console.log("Connecting to Archethic's wallet");
      const archethic = new Archethic("ws://127.0.0.1:12345");
      archethic.rpcWallet.setOrigin({ name: "Archethic Multisig CLI" });
      await archethic.connect();
      connection.value = archethic;
      const { genesisAddress: currentAddress, shortName: currentName } =
        await archethic.rpcWallet.getCurrentAccount();
      accountAddress.value = currentAddress;
      accountName.value = currentName;

      const { endpointUrl } = await archethic.rpcWallet.getEndpoint();
      endpoint.value = endpointUrl;

      await archethic.rpcWallet.onCurrentAccountChange(async () => {
        const { genesisAddress: currentAddress, shortName: currentName } =
          await archethic.rpcWallet.getCurrentAccount();
        accountAddress.value = currentAddress;
        accountName.value = currentName;
      });
      return archethic;
    } catch (e) {
      throw e;
    }
  }

  return {
    connection,
    isConnected,
    connect,
    accountAddress,
    accountName,
    endpoint,
  };
});
