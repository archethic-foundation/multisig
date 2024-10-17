import { ref, computed, type Ref, type ComputedRef } from "vue";
import { defineStore, type SetupStoreDefinition, type StoreActions, type StoreDefinition } from "pinia";

import Archethic from "@archethicjs/sdk";

export type ConnectionStore = {
  connection: ComputedRef<Archethic | null>;
  isConnected: ComputedRef<boolean>;
  connect: () => Promise<Archethic>;
  accountAddress: Ref<string>;
  accountName: Ref<string>;
  endpoint: Ref<string>;
}

export const useConnectionStore = defineStore("connection", (): ConnectionStore  => {
  const connection: Ref<null | Archethic> = ref(null);
  const isConnected = computed(() => {
    return connection.value != undefined;
  });
  const accountAddress = ref("");
  const accountName = ref("");
  const endpoint = ref("");
  const connecting = ref(false);

  async function connect(): Promise<Archethic> {
    if (isConnected.value && connection.value) {
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

  const computedConnection = computed(() => connection.value)

  return {
    connection: computedConnection,
    isConnected,
    connect,
    accountAddress,
    accountName,
    endpoint,
  };
});

export type Account = {
  accountAddress: string;
  accountName: string;
}

async function getWalletConnection(): Promise<Archethic> {
  const archethic = new Archethic(undefined); // To mention the wallet connection is used
  archethic.rpcWallet?.setOrigin({ name: "Archethic Multisig CLI" });
  console.log("Connecting to Archethic's wallet");
  await archethic.connect();
  return archethic;
}

async function loadAccount(archethic: Archethic, changeCallback: (account: Account) => void) {
  const accountId = await archethic.rpcWallet?.getCurrentAccount();
  

  await archethic.rpcWallet?.onCurrentAccountChange(async () => {
    const accountId = await archethic.rpcWallet?.getCurrentAccount();

    changeCallback({
      accountAddress: accountId?.genesisAddress,
      accountName: accountId?.shortName,
    } as Account);
  });

  return { accountAddress: accountId?.genesisAddress, accountName: accountId?.shortName } as Account;
}

async function loadEndpoint(archethic: Archethic): Promise<string> {
  if (archethic.rpcWallet) {
    const { endpointUrl } = await archethic.rpcWallet?.getEndpoint();
    return endpointUrl;
  }
  throw new Error("Wallet not connected")
}
