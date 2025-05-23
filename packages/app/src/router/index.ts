import { createRouter, createWebHashHistory } from "vue-router";
import HomeView from "../views/HomeView.vue";

const router = createRouter({
  history: createWebHashHistory(),
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
      path: "/app/new",
      name: "create_multisig",
      component: () => import("../views/CreateMultisigView.vue"),
    },
    {
      path: "/app/:contractAddress",
      name: "app",
      component: () => import("../views/MultisigView.vue"),
    },
  ],
});

export default router;
