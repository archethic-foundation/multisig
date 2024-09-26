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
  const connecting = ref(false);

  async function connect() {
    if (isConnected.value) {
      return connection.value;
    }
    if (connecting.value) {
      await new Promise((r) => setTimeout(r, 100));
      return await connect();
    }
    connecting.value = true;
    const archethic = await getWalletConnection();

    const { accountAddress: currentAddress, accountName: currentName } =
      await loadAccount(
        archethic,
        ({ accountAddress: currentAddress, accountName: currentName }) => {
          accountAddress.value = currentAddress;
          accountName.value = currentName;
        },
      );

    accountAddress.value = currentAddress;
    accountName.value = currentName;

    endpoint.value = await loadEndpoint(archethic);
    connection.value = archethic;
    connecting.value = false;

    return archethic;
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

async function getWalletConnection() {
  const archethic = new Archethic(undefined); // To mention the wallet connection is used
  archethic.rpcWallet.setOrigin({ name: "Archethic Multisig CLI" });
  console.log("Connecting to Archethic's wallet");
  await archethic.connect();
  return archethic;
}

async function loadAccount(archethic, changeCallback) {
  const { genesisAddress: currentAddress, shortName: currentName } =
    await archethic.rpcWallet.getCurrentAccount();

  await archethic.rpcWallet.onCurrentAccountChange(async (account) => {
    const { genesisAddress: currentAddress, shortName: currentName } =
      await archethic.rpcWallet.getCurrentAccount();

    changeCallback({
      accountAddress: currentAddress,
      accountName: currentName,
    });
  });

  return { accountAddress: currentAddress, accountName: currentName };
}

async function loadEndpoint(archethic) {
  const { endpointUrl } = await archethic.rpcWallet.getEndpoint();
  return endpointUrl;
}
