<script setup>
import TheWelcome from "../components/TheWelcome.vue";
import HelloWorld from "../components/HelloWorld.vue";
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
                <HelloWorld msg="AEVault" />
            </div>
        </header>
        <main class="pl-20">
            <TheWelcome />
        </main>
    </div>
</template>
