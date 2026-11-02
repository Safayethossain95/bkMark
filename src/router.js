import { createRouter, createWebHistory } from "vue-router";
import GoogleView from "./views/GoogleView.vue";

const routes = [
  {
    path: "/",
    name: "Google",
    component: GoogleView,
  },
  {
    path: "/google",
    redirect: "/",
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/",
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;

