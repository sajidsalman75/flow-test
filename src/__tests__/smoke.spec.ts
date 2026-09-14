import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import { VueQueryPlugin } from "@tanstack/vue-query";
import App from "../App.vue";
import FlowView from "../views/FlowView.vue";
import { vuetify } from "./testUtils";

/**
 * A real end-to-end smoke test: mounts the actual App (router + Pinia +
 * Vue Query + Vuetify wired exactly like main.ts) against jsdom and waits
 * for the fake-API fetch to resolve, to catch runtime errors that
 * type-checking and unit tests alone wouldn't (wrong prop wiring, plugin
 * registration order, etc.).
 */
describe("App smoke test", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("boots, fetches the flow, and renders the toolbar + canvas without throwing", async () => {
    const router = createRouter({
      history: createWebHistory(),
      routes: [{ path: "/", name: "canvas", component: FlowView }],
    });
    router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [createPinia(), router, VueQueryPlugin, vuetify],
      },
      attachTo: document.body,
    });

    // Wait for the simulated fetch to resolve, rather than a fixed delay —
    // a hardcoded setTimeout is flaky under CPU contention,
    // since the fake API's own artificial latency is a moving target relative to it.
    await vi.waitFor(
      () => {
        expect(wrapper.text()).not.toContain("Loading flow");
      },
      { timeout: 2000, interval: 25 }
    );

    expect(wrapper.text()).toContain("Flow Builder");
    expect(wrapper.text()).toContain("Create New Node");
    expect(wrapper.text()).not.toContain("Couldn't load the flow");
  });
});
