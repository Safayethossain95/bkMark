import { createRouter, createWebHistory } from "vue-router";
import RevampedView from "./views/RevampedView.vue";
import ClassicView from "./views/ClassicView.vue";

const routes = [
  {
    path: "/",
    name: "Revamped",
    component: RevampedView,
  },
  {
    path: "/version2",
    name: "Classic",
    component: ClassicView,
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
