<script setup>
import Assets from "@/components/multisig/Assets.vue";
import Loading from "@/components/Loading.vue";
import Button from "@/components/Button.vue";
import Address from "../Address.vue";
import { useVaultStore } from "@/stores/vaults";
import { computed, ref, onMounted } from "vue";

const props = defineProps({
  address: {
    type: String,
    required: true,
  },
  endpoint: {
    type: String,
    required: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  balance: {
    type: Object,
    required: true,
  },
});

const vault = ref(undefined);
const vaults = ref([]);
const vaultName = ref("");
const vaultStore = useVaultStore();
const disableBookmark = ref(false);

const alreadyBookmarked = computed(() => vault.value !== undefined);
const vaultTitle = computed(() => {
  if (vaultName.value == "") {
    return "Give it a name";
  }
  return vaultName.value;
});

function setVaultName() {
  vaultStore.nameVault(props.address, vaultName.value);
}

onMounted(() => {
  vaults.value = vaultStore.getVaults();
  vault.value = vaults.value.find((v) => {
    return v.address.toUpperCase() == props.address.toUpperCase();
  });
  vaultName.value = vault.value ? vault.value.name : "";
});

function bookmarkVault() {
  disableBookmark.value = true;
  vaultStore.addVault(props.address);
  vaults.value = vaultStore.getVaults();
  vault.value = vaults.value.find((v) => {
    return v.address.toUpperCase() == props.address.toUpperCase();
  });
  disableBookmark.value = false;
}
</script>

<template>
  <div class="flex flex-col">
    <div class="flex flex-row justify-between">
      <h2 class="text-xl text-slate-600">
        Multsig: <Address :address="props.address" chain />
      </h2>
      <div class="flex-1"></div>
      <div class="flex gap-2">
        <a
          :href="`${props.endpoint}/explorer/chain?address=${props.address}`"
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

  <Loading v-if="props.loading" />
  <div v-show="!props.loading">
    <p class="mt-10 mb-2 text-slate-500">Assets</p>
    <Assets :balance="props.balance" />
  </div>
</template>
