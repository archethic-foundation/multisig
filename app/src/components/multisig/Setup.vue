<script setup>
import { ref, computed, watch, toRef } from "vue";

import Button from "../Button.vue";
import List from "../List.vue";
import Voter from "./Voter.vue";
import VoterForm from "./voter/form.vue";
import ConfirmationSelect from "./setup/confirmationSelect.vue";

import { Utils } from "@archethicjs/sdk";

const props = defineProps({
    voters: {
        type: Array,
        default: [],
    },
    requiredConfirmations: {
        type: Number,
        default: 1,
    },
});

const emit = defineEmits(["new-confirmation-threshold", "new-voters"]);

const showNewVoterForm = ref(false);
const nbVoters = computed(() => props.voters.length);

function handleRequiredConfirmationChange(newRequiredConfirmations) {
    emit("new-confirmation-threshold", newRequiredConfirmations);
}

function handleNewVoter(voterAddress) {
    const voters = props.voters;
    voters.push({ address: voterAddress });
    emit("new-voters", voters);
}

function handleRemoveVoter(voterAddress) {
    const newVoters = props.voters.filter((voter) => {
        return voter.address != voterAddress;
    });
    emit("new-voters", newVoters);
}
</script>

<template>
    <ConfirmationSelect
        :nb-voters="nbVoters"
        :selection="requiredConfirmations"
        @set-required-confirmations="handleRequiredConfirmationChange"
    />
    <div class="flex justify-between place-items-center mt-10 content-center">
        <h3 class="text-md">Voters</h3>
        <Button
            class="bg-slate-500"
            @click="showNewVoterForm = true"
            v-show="!showNewVoterForm"
            >Add voter</Button
        >
    </div>
    <p class="text-xs text-slate-500 mt-1 mb-5">
        List all the addresses able to sign and emit transactions
    </p>
    <div v-show="showNewVoterForm">
        <VoterForm @new-voter="handleNewVoter" />
    </div>
    <div class="flex flex-col gap-3" v-if="nbVoters > 0">
        <List :items="props.voters">
            <template #item="voter">
                <Voter :voter="voter" @remove-voter="handleRemoveVoter" />
            </template>
        </List>
    </div>
</template>
