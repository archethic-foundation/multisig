<script setup lang="ts">
import Button from "@/components/Button.vue";
import WelcomeItem from "@/components/landing/WelcomeItem.vue";
import IconTooling from "@/components/icons/IconTooling.vue";
import IconDocumentation from "@/components/icons/IconDocumentation.vue";
import IconEcosystem from "@/components/icons/IconEcosystem.vue";

import Router from "@/router";

function redirect() {
  Router.push("/app");
}
</script>

<template>
  <div class="flex flex-col gap-10">
    <WelcomeItem>
      <template v-slot:icon>
        <IconTooling />
      </template>
      <template v-slot:heading>
        Secure your assets with multi-signatures
      </template>
    </WelcomeItem>

    <WelcomeItem>
      <template v-slot:icon>
        <IconDocumentation />
      </template>
      <template v-slot:heading>
        Leverage Archethic's transaction chain
      </template>
    </WelcomeItem>

    <WelcomeItem>
      <template v-slot:icon>
        <IconEcosystem />
      </template>
      <template v-slot:heading> Simple & Decentralized </template>
    </WelcomeItem>
  </div>
  <div class="mt-10">
    <Button @click="redirect">Getting Started</Button>
  </div>
</template>
