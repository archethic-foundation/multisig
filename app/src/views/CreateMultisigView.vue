<script setup lang="ts">
import Button from "@/components/Button.vue";
import Warning from "@/components/Warning.vue";

import SetupForm from "@/components/multisig/SetupForm.vue";
import Archethic, { Crypto, Utils } from "@archethicjs/sdk";

import { ref, onMounted, type Ref } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";
import type { Setup, Voter } from "@/types";
import { useVaultStore } from "@/stores/vaults";

const connectionStore = useConnectionStore();
const vaultStore = useVaultStore();
const router = useRouter();

type setup = {
  voters: Voter[];
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
    voters: [{ address: currentAddress, name: "Connected wallet" }],
    confirmationThreshold: 1,
  };
});

function handleNewVoters(voters: Voter[]) {
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
    await fundSC(archethic, multisigGenesis);

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

async function fundSC(archethic: Archethic, multisigGenesis: Uint8Array) {
  const transferTx = archethic.transaction
    .new()
    .setType("transfer")
    .addUCOTransfer(multisigGenesis, Utils.parseBigInt("1"));

  console.log("Sending 1 UCO to fund mulitisig chain...");
  await archethic.rpcWallet?.sendTransaction(transferTx);
}

async function createContractTransaction(
  archethic: Archethic,
  setup: Setup,
  seedSC: Uint8Array,
) {
  const { voters: voters, confirmationThreshold: confirmationThreshold } = setup
  const { secret, authorizedKeys } = await getSCOwnnership(archethic, seedSC);

  const initContent = JSON.stringify({
    voters: voters.map(({ address }) => address),
    confirmationThreshold: confirmationThreshold,
  });

  return archethic.transaction
    .new()
    .setType("contract")
    .setCode(await getContractCode())
    .addOwnership(secret, authorizedKeys)
    .setContent(initContent)
    .build(seedSC, 0)
    .originSign(Utils.originPrivateKey);
}

async function getContractCode(): Promise<string> {
  const response = await fetch("/contract.aesc");
  return response.text();
}

async function getSCOwnnership(archethic: Archethic, seed: Uint8Array) {
  const aesKey = Crypto.randomSecretKey();
  const storageNoncePublicKey =
    await archethic.network.getStorageNoncePublicKey();

  return {
    secret: Crypto.aesEncrypt(seed, aesKey),
    authorizedKeys: [
      {
        publicKey: storageNoncePublicKey,
        encryptedSecretKey: Utils.uint8ArrayToHex(Crypto.ecEncrypt(aesKey, storageNoncePublicKey)),
      },
    ],
  };
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
