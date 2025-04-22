<script setup lang="ts">
import Button from "@/components/Button.vue";
import Warning from "@/components/Warning.vue";

import SetupForm from "@/components/multisig/SetupForm.vue";
import Archethic, { Crypto, Utils } from "@archethicjs/sdk";

import { ref, onMounted, type Ref } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import type { Setup } from "@/types";
import { useVaultStore } from "@/stores/vaults";
import { getDeployTransaction } from "@archethicjs/multisig-sdk";
import type { ContractManifest } from "@archethicjs/sdk/dist/contract";
import { Contract } from "@archethicjs/sdk/dist/contract"

const connectionStore = useConnectionStore();
const vaultStore = useVaultStore();
const router = useRouter();

type setup = {
  voters: string[];
  confirmationThreshold: number;
}

const multisigSetup: Ref<setup> = ref({
  voters: [],
  confirmationThreshold: 0,
} as Setup);

const deployErrMsg = ref("");
const pendingDeployment = ref(false);

onMounted(async () => {
  await connectionStore.connect();
  const currentAddress = connectionStore.accountAddress;
  multisigSetup.value = {
    voters: [currentAddress],
    confirmationThreshold: 1,
  };
});

function handleNewVoters(voters: string[]) {
  multisigSetup.value.voters = voters;
}

function handleNewConfirmationThreshold(confirmationThreshold: number) {
  multisigSetup.value.confirmationThreshold = confirmationThreshold;
}

async function deployMultisig() {
  deployErrMsg.value = "";
  pendingDeployment.value = true;
  try {
    const archethic = connectionStore.connection;
    if (!archethic) {
      return
    }
    const seedSC = Crypto.randomSecretKey();
    const multisigGenesis = Crypto.deriveAddress(seedSC);

    const multisigTx = await createContractTransaction(
      archethic,
      multisigSetup.value,
      seedSC,
    );

    multisigTx
      .on("requiredConfirmation", (nbConf: number) => {
        pendingDeployment.value = false;
        vaultStore.addVault(Utils.uint8ArrayToHex(multisigGenesis));
        router.push({
          name: "app",
          params: {
            contractAddress: Utils.uint8ArrayToHex(multisigGenesis),
          },
        });
      })
      .on("error", (_context: string, reason: string) => {
        deployErrMsg.value = reason;
      })
      .on("timeout", () => {
        deployErrMsg.value = "Contract's creation timeout";
      })
      .send();
  } catch (e) {
    deployErrMsg.value = (e as Error).message;
    pendingDeployment.value = false;
  }
}

async function createContractTransaction(
  archethic: Archethic,
  setup: Setup,
  seedSC: Uint8Array,
) {
  const contract = await fetchContract()
  const tx = await getDeployTransaction(archethic, { voters: setup.voters, confirmationThreshold: setup.confirmationThreshold}, seedSC, contract)
  return tx
    .build(seedSC, 0)
    .originSign(Utils.originPrivateKey);
}

async function fetchContract(): Promise<Contract> {
  const bytecode = await fetchContractBytecode()
  const manifest = await fetchContractManifest()
  return new Contract(new Uint8Array(bytecode), manifest)
}

function fetchContractBytecode(): Promise<ArrayBuffer> {
  return fetch("./contract.wasm")
    .then(r => r.arrayBuffer())
}

function fetchContractManifest(): Promise<ContractManifest> {
  return fetch("./contract_manifest.json")
    .then(r => r.json())
}

</script>

<template>
  <div class="flex flex-col items-center justify-center h-screen">
    <div class="bg-white p-5 rounded-md w-1/2 mt-5">
      <header class="mb-5 flex justify-between place-items-center">
        <h2 class="text-xl mb-5s">Setup</h2>
      </header>
      <SetupForm
        :voters="multisigSetup.voters"
        @new-voters="handleNewVoters"
        @new-confirmation-threshold="handleNewConfirmationThreshold"
        :canEdit="!pendingDeployment"
      />
      <div class="mt-10">
        <Button @click="deployMultisig" :disabled="pendingDeployment">
          <span v-show="!pendingDeployment">Deploy multisig</span>
          <span v-show="pendingDeployment">Pending...</span>
        </Button>
      </div>
      <Warning v-show="deployErrMsg != ''" class="mt-5">{{
        deployErrMsg
      }}</Warning>
    </div>
  </div>
</template>
