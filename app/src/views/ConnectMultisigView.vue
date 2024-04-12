<script setup>
import Button from "../components/Button.vue";
import Setup from "../components/multisig/Setup.vue";
import ConnectMultisig from "../components/ConnectMultisig.vue";
import { Crypto, Utils } from "@archethicjs/sdk";

import { ref } from "vue";
import { useRouter } from "vue-router";
import { useConnectionStore } from "@/stores/connection";

const connectionStore = useConnectionStore();
const router = useRouter();
const multiSigAddr = ref("");
const multisigSetup = ref({
    voters: [],
    confirmationThreshold: 0,
});

const canShowCreateForm = ref(false);
const deployErrMsg = ref("");

let archethic;

function goToMultisig(multisig) {
    router.push({
        name: "app",
        params: {
            contractAddress: multisig,
        },
    });
}

async function showCreateForm() {
    archethic = await connectionStore.connect();
    const currentAddress = connectionStore.accountAddress;

    multisigSetup.value = {
        voters: [{ address: currentAddress, name: "Connected wallet" }],
        confirmationThreshold: 1,
    };
    canShowCreateForm.value = true;
}

function handleNewVoters(voters) {
    multisigSetup.value.voters = voters;
}

function handleNewConfirmationThreshold(confirmationThreshold) {
    multisigSetup.value.confirmationThreshold = confirmationThreshold;
}

async function deployMultisig() {
    try {
        const seedSC = Crypto.randomSecretKey();
        const multisigGenesis = Crypto.deriveAddress(seedSC);

        await fundSC(archethic, multisigGenesis);

        const multisigTx = await createContractTransaction(
            archethic,
            multisigSetup.value,
            seedSC,
        );

        multisigTx
            .on("requiredConfirmation", (nbConf) => {
                router.push({
                    name: "app",
                    params: {
                        contractAddress: Utils.uint8ArrayToHex(multisigGenesis),
                    },
                });
            })
            .on("error", (context, reason) => {
                deployErrMsg.value = reason;
            })
            .on("timeout", () => {
                deployErrMsg.value = "Contract's creation timeout";
            })
            .send();
    } catch (e) {
        deployErrMsg.value = e;
    }
}

async function fundSC(archethic, multisigGenesis) {
    const transferTx = archethic.transaction
        .new()
        .setType("transfer")
        .addUCOTransfer(multisigGenesis, Utils.toBigInt(1));

    console.log("Sending 1 UCO to fund mulitisig chain...");
    await archethic.rpcWallet.sendTransaction(transferTx);
}

async function createContractTransaction(
    archethic,
    { voters: voters, confirmationThreshold: confirmationThreshold },
    seedSC,
) {
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

async function getContractCode() {
    const response = await fetch("/contract.aesc");
    return response.text();
}

async function getSCOwnnership(archethic, seed) {
    const aesKey = Crypto.randomSecretKey();
    const storageNoncePublicKey =
        await archethic.network.getStorageNoncePublicKey();

    return {
        secret: Crypto.aesEncrypt(seed, aesKey),
        authorizedKeys: [
            {
                publicKey: storageNoncePublicKey,
                encryptedSecretKey: Crypto.ecEncrypt(
                    aesKey,
                    storageNoncePublicKey,
                ),
            },
        ],
    };
}
</script>

<template>
    <div class="flex flex-col items-center justify-center h-screen">
        <div class="bg-white p-5 rounded-md w-1/3" v-show="!canShowCreateForm">
            <ConnectMultisig @connect="goToMultisig" />
            <p
                class="mt-5 text-sm text-slate-500 underline"
                @click="showCreateForm"
            >
                You need one, create it in few clicks
            </p>
        </div>

        <div
            class="bg-white p-5 rounded-md w-1/2 mt-5"
            v-show="canShowCreateForm"
        >
            <header class="mb-5 flex justify-between place-items-center">
                <h2 class="text-xl mb-5s">Setup</h2>
            </header>
            <Setup
                :voters="multisigSetup.voters"
                @new-voters="handleNewVoters"
                @new-confirmation-threshold="handleNewConfirmationThreshold"
            />
            <Button class="mt-10" @click="deployMultisig"
                >Deploy multisig</Button
            >
            <p class="text-sm text-red-800 mt-5" v-show="deployErrMsg != ''">
                {{ deployErrMsg }}
            </p>
        </div>
    </div>
</template>
