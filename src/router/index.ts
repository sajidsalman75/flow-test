import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";
import FlowView from "../views/FlowView.vue";

// Both routes render the same FlowView component. The canvas is always
// mounted; the details drawer visibility is derived from route.params.id.
// This keeps the canvas <-> drawer transition smooth (no route-based
// component swap / remount of vue-flow).
const routes: RouteRecordRaw[] = [
  {
    path: "/",
    name: "canvas",
    component: FlowView,
  },
  {
    path: "/node/:id",
    name: "node-details",
    component: FlowView,
    props: true,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
