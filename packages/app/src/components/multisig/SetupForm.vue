<script setup lang="ts">
import { ref, computed } from "vue";

import Button from "../Button.vue";
import VoterItem from "./VoterItem.vue";
import VoterForm from "./VoterForm.vue";
import ConfirmationSelect from "./SetupForm/ConfirmationSelect.vue";
import type { Voter } from "@/types";

type Props = {
  voters: Voter[];
  requiredConfirmations?: number;
  canEdit?: boolean;
}

const props = defineProps<Props>()

const emit = defineEmits(["new-confirmation-threshold", "new-voters"]);

const showNewVoterForm = ref(false);
const nbVoters = computed(() => props.voters.length);

function handleRequiredConfirmationChange(newRequiredConfirmations: number) {
  emit("new-confirmation-threshold", newRequiredConfirmations);
}

function handleNewVoter(voterAddress: string) {
  const newVoters = props.voters;
  newVoters.push({ address: voterAddress });
  emit("new-voters", props.voters);
}

function handleRemoveVoter(voterAddress: string) {
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
      v-show="canEdit && !showNewVoterForm"
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
    <VoterItem
      :voter="voter"
      @remove-voter="handleRemoveVoter"
      v-for="voter in props.voters"
    />
  </div>
</template>
