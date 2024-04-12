<script setup>
import { ref, onMounted } from "vue";
import { Utils } from "@archethicjs/sdk";

import Button from "./Button.vue";
import { useConnectionStore } from "@/stores/connection";

const emit = defineEmits(["connect"]);

const multisig = ref("");
const errMsg = ref("");

const connectionStore = useConnectionStore();

function connect() {
    if (!Utils.isHex(multisig.value)) {
        errMsg.value = "Invalid address";
        return;
    }
    errMsg.value = "";
    emit("connect", multisig.value);
}
</script>

<template>
    <h2 class="text-md text-slate-600">Access your vault</h2>
    <div class="mt-5 flex flex-col">
        <input
            type="text"
            class="p-1 border-b text-slate bg-transparent border[#ddd] mt-5 outline-none text-sm"
            placeholder="Enter your vault contract's address"
            v-model="multisig"
            @keyup.enter="connect"
        />
        <p v-show="errMsg != ''" class="text-xs text-red-500 mt-1">
            {{ errMsg }}
        </p>
        <div class="w-1/6 mt-5">
            <Button @click="connect">Connect</Button>
        </div>
    </div>
</template>
