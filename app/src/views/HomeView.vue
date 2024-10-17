<script setup lang="ts">
import TheWelcome from "@/components/landing/TheWelcome.vue";
</script>

<template>
  <div class="flex items-center justify-center h-screen gap-20 divide-x">
    <header class="flex flex-col gap-10 items-center">
      <img
        alt="Vue logo"
        class="block"
        src="@/assets/logo.svg"
        width="125"
        height="125"
      />
      <div class="fox">
        <h1 class="font-weight-medium text-5xl text-slate-300">AEVault</h1>
      </div>
    </header>
    <main class="pl-20">
      <TheWelcome />
    </main>
  </div>
</template>
