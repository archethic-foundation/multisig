import { createRouter, createWebHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
    },
    {
      path: "/app",
      name: "connect_multisig",
      component: () => import("../views/ConnectMultisigView.vue"),
    },
    {
      path: "/app/:contractAddress",
      name: "app",
      component: () => import("../views/MultisigView.vue"),
    },
  ],
});

export default router;
