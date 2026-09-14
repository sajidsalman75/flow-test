import { describe, it, expect } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createRouter, createWebHistory } from "vue-router";
import CustomNode from "../components/CustomNode.vue";
import type { FlowNodeData } from "../types";
import { vuetify } from "./testUtils";

async function mountNode(
  overrides: Partial<{ id: string; type: string }> & {
    data?: FlowNodeData;
  } = {}
) {
  const router = createRouter({
    history: createWebHistory(),
    routes: [
      { path: "/", name: "canvas", component: { template: "<div />" } },
      {
        path: "/node/:id",
        name: "node-details",
        component: { template: "<div />" },
      },
    ],
  });
  router.push("/");
  await router.isReady();

  const wrapper = mount(CustomNode, {
    props: {
      id: "n1",
      type: "custom",
      data: {
        title: "Welcome Message",
        description: "Hi there",
        realType: "sendMessage",
        accent: "slate",
      } as FlowNodeData,
      ...overrides,
    },
    global: {
      plugins: [router, vuetify],
      stubs: { Handle: true },
    },
  });
  return { wrapper, router };
}

describe("CustomNode", () => {
  it("emits add-child with its own id when the + button is clicked, without navigating", async () => {
    const { wrapper, router } = await mountNode();
    const pushSpy = router.push;
    await wrapper.find(".flow-node__add-child").trigger("click");

    expect(wrapper.emitted("add-child")).toEqual([["n1"]]);
    expect(router.currentRoute.value.name).not.toBe("node-details");
    void pushSpy;
  });

  it("still navigates to the details route on a card click", async () => {
    const { wrapper, router } = await mountNode();
    await wrapper.find(".flow-node").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("node-details");
    expect(router.currentRoute.value.params.id).toBe("n1");
  });

  it("navigates to the details route for a display-only node too (opens in preview mode)", async () => {
    const { wrapper, router } = await mountNode({
      data: {
        title: "Trigger",
        description: "",
        realType: "trigger",
        accent: "pink",
      } as FlowNodeData,
    });
    await wrapper.find(".flow-node").trigger("click");
    await flushPromises();
    expect(router.currentRoute.value.name).toBe("node-details");
    expect(router.currentRoute.value.params.id).toBe("n1");
  });
});
