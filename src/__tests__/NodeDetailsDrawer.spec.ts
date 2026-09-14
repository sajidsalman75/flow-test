import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  mount,
  flushPromises,
  DOMWrapper,
  type VueWrapper,
} from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { VApp } from "vuetify/components";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createWebHistory, useRoute } from "vue-router";
import NodeDetailsDrawer from "../components/NodeDetailsDrawer.vue";
import { useFlowStore } from "../stores/flowStore";
import { vuetify } from "./testUtils";
import type { Flow } from "../types";

const Host = defineComponent({
  setup() {
    const route = useRoute();
    return () =>
      h(VApp, null, {
        default: () =>
          h(NodeDetailsDrawer, { nodeId: (route.params.id as string) || null }),
      });
  },
});

function makeFlow(): Flow {
  return {
    nodes: [
      {
        id: "trigger-1",
        type: "trigger",
        position: { x: 0, y: 0 },
        data: {
          title: "Conversation Opened",
          description: "Fires every time a conversation opens",
          displayOnly: true,
        },
      },
      {
        id: "msg-1",
        type: "sendMessage",
        position: { x: 0, y: 200 },
        data: {
          title: "Welcome",
          description: "Hi there",
          texts: ["Hi there"],
          attachments: [],
        },
      },
      {
        id: "comment-1",
        type: "addComment",
        position: { x: 0, y: 400 },
        data: {
          title: "Note",
          description: "Internal note",
          comments: ["Original comment"],
        },
      },
      {
        id: "hours-1",
        type: "businessHours",
        position: { x: 0, y: 600 },
        data: {
          title: "Business Hours",
          description: "Business Hours - UTC",
          hours: [{ day: "Monday", open: "09:00", close: "17:00" }],
          timezone: "UTC",
        },
      },
    ],
    edges: [{ id: "e1", source: "trigger-1", target: "msg-1" }],
  };
}

let currentWrapper: VueWrapper | null = null;

afterEach(() => {
  currentWrapper?.unmount();
  currentWrapper = null;
});

async function mountDrawer(nodeId: string | null) {
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

  await router.push(nodeId ? `/node/${nodeId}` : "/");
  await router.isReady();

  const wrapper = mount(Host, {
    global: { plugins: [router, vuetify] },
    attachTo: document.body,
  });
  currentWrapper = wrapper;
  await flushPromises();
  const body = new DOMWrapper(document.body);
  const drawer = wrapper.findComponent(NodeDetailsDrawer);
  return { drawer, body, router };
}

describe("NodeDetailsDrawer", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    useFlowStore().setFlow(makeFlow());
  });

  it("shows a read-only preview for a display-only node, with no Update/Delete buttons", async () => {
    const { body } = await mountDrawer("trigger-1");
    expect(body.text()).toContain("Preview");
    expect(body.text()).toContain("Conversation Opened");
    expect(body.find("input").exists()).toBe(false);
    expect(body.text()).not.toContain("Update");
    expect(body.text()).not.toContain("Delete node");
  });

  it("redirects to canvas for a node id that does not exist", async () => {
    const { router } = await mountDrawer("does-not-exist");
    expect(router.currentRoute.value.name).toBe("canvas");
  });

  it("does NOT redirect while the flow store has not initialized yet (e.g. mid-fetch)", async () => {
    setActivePinia(createPinia());
    const { router } = await mountDrawer("msg-1");
    expect(router.currentRoute.value.name).not.toBe("canvas");
  });

  it("shows an editable form with an Update button for an editable node", async () => {
    const { body } = await mountDrawer("msg-1");
    expect(body.find('input[name="title"]').exists()).toBe(true);
    expect(body.text()).toContain("Update");
  });

  it("emits update-node with title, description, and panel data when Update is clicked", async () => {
    const { drawer, body } = await mountDrawer("msg-1");

    await body.find('input[name="title"]').setValue("Updated title");
    await body
      .findAll("button")
      .find((b) => b.text() === "Update")!
      .trigger("click");
    await flushPromises();

    const emitted = drawer.emitted("update-node");
    expect(emitted).toBeTruthy();
    const payload = emitted![0][0] as {
      id: string;
      data: Record<string, unknown>;
    };
    expect(payload.id).toBe("msg-1");
    expect(payload.data.title).toBe("Updated title");
    expect(payload.data.texts).toEqual(["Hi there"]);
  });

  it("does not save on blur alone — only the Update button emits update-node", async () => {
    const { drawer, body } = await mountDrawer("msg-1");
    await body.find('input[name="title"]').setValue("Not saved yet");
    await body.find('input[name="title"]').trigger("blur");
    await flushPromises();
    expect(drawer.emitted("update-node")).toBeUndefined();
  });

  it("addComment: no description field, and only a single comment field (not a list)", async () => {
    const { drawer, body } = await mountDrawer("comment-1");
    expect(body.find('input[name="title"]').exists()).toBe(true);
    expect(body.find('textarea[name="description"]').exists()).toBe(false);
    expect(body.text()).not.toContain("Add comment");

    await body
      .findAll("button")
      .find((b) => b.text() === "Update")!
      .trigger("click");
    await flushPromises();

    const emitted = drawer.emitted("update-node");
    const payload = emitted![0][0] as { data: { comments: string[] } };
    expect(payload.data.comments).toEqual(["Original comment"]);
  });

  it("sendMessage: no description field in the drawer", async () => {
    const { body } = await mountDrawer("msg-1");
    expect(body.find('textarea[name="description"]').exists()).toBe(false);
  });

  it("businessHours: title and description are read-only text, not inputs", async () => {
    const { body } = await mountDrawer("hours-1");
    expect(body.find('input[name="title"]').exists()).toBe(false);
    expect(body.find('textarea[name="description"]').exists()).toBe(false);
    expect(body.text()).toContain("Business Hours");
    expect(body.text()).toContain("Business Hours - UTC");
    expect(body.text()).toContain("Update");
  });

  it("stays open after navigating to a node post-mount, instead of auto-closing itself", async () => {
    const { router, body } = await mountDrawer(null);
    expect(router.currentRoute.value.name).toBe("canvas");

    await router.push("/node/msg-1");
    await flushPromises();

    expect(router.currentRoute.value.name).toBe("node-details");
    const titleInput = body.find('input[name="title"]');
    expect(titleInput.exists()).toBe(true);
    expect((titleInput.element as HTMLInputElement).value).toBe("Welcome");
  });
});
