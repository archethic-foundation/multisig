<script setup lang="ts">
import Assets from "@/components/multisig/Assets.vue";
import Loading from "@/components/Loading.vue";
import Button from "@/components/Button.vue";
import Address from "../Address.vue";
import { useVaultStore, type Vault } from "@/stores/vaults";
import { computed, ref, onMounted, type Ref } from "vue";
import type { Balance } from "./types";

interface Props {
  address: string;
  endpoint: string;
  loading: boolean;
  balance: Balance
}

const { address, endpoint, balance, loading = false } = defineProps<Props>()

const vault: Ref<Vault> = ref({ address: ""});
const vaults: Ref<Vault[]> = ref([]);
const vaultName = ref("");
const vaultStore = useVaultStore();
const disableBookmark = ref(false);

const alreadyBookmarked = computed(() => vault.value.address !== "");
const vaultTitle = computed(() => {
  if (vaultName.value == "") {
    return "Give it a name";
  }
  return vaultName.value;
});

function setVaultName() {
  vaultStore.nameVault(address, vaultName.value);
}

onMounted(() => {
  vaults.value = vaultStore.getVaults();
  const localVault = vaults.value.find((v) => {
    return v.address.toUpperCase() == address.toUpperCase();
  });
  if (localVault) {
    vault.value = localVault
    if (localVault.name) {
      vaultName.value = localVault.name;
    }
  }
});

function bookmarkVault() {
  disableBookmark.value = true;
  vaultStore.addVault(address);
  vaults.value = vaultStore.getVaults();
  vault.value = vaults.value.find((v) => {
    return v.address.toUpperCase() == address.toUpperCase();
  }) as Vault;
  disableBookmark.value = false;
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex flex-row justify-between">
      <h2 class="text-xl text-slate-600">
        Multsig: <Address :address="address" chain />
      </h2>
      <div class="flex-1"></div>
      <div class="flex gap-2">
        <a
          :href="`${endpoint}/explorer/chain?address=${address}`"
          class="content-center"
          target="_blank"
          ><Button>Explore on-chain</Button></a
        >
        <Button
          v-show="!alreadyBookmarked"
          @click="bookmarkVault"
          :disabled="disableBookmark"
          >Bookmark it</Button
        >
      </div>
    </div>
    <div>
      <input
        class="text-slate-500 bg-transparent border[#ddd] outline-none text-sm mt-2 border-b w-1/4"
        v-model="vaultName"
        :placeholder="vaultTitle"
        @keyup.enter="setVaultName"
        @change="setVaultName"
      />
    </div>
  </div>

  <Loading v-if="loading" />
  <div v-show="!loading">
    <p class="mt-10 mb-2 text-slate-500">Assets</p>
    <Assets :balance="balance" />
  </div>
</template>
