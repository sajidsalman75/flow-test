import { describe, it, expect, afterEach } from "vitest";
import {
  mount,
  flushPromises,
  DOMWrapper,
  type VueWrapper,
} from "@vue/test-utils";
import CreateNodeModal from "../components/CreateNodeModal.vue";
import { vuetify } from "./testUtils";

let currentWrapper: VueWrapper | null = null;

afterEach(() => {
  currentWrapper?.unmount();
  currentWrapper = null;
});

async function mountModal(
  props: Partial<{
    open: boolean;
    isPending: boolean;
    parentTitle: string | null;
  }> = {}
) {
  const wrapper = mount(CreateNodeModal, {
    props: { open: true, isPending: false, ...props },
    global: {
      plugins: [vuetify],
    },
    attachTo: document.body,
  });
  currentWrapper = wrapper;
  await flushPromises();
  const body = new DOMWrapper(document.body);
  return { wrapper, body };
}

function clickButtonWithText(body: DOMWrapper<HTMLElement>, text: string) {
  return body
    .findAll("button")
    .find((b) => b.text().trim() === text)!
    .trigger("click");
}

describe("CreateNodeModal", () => {
  it("does not render when closed", async () => {
    const { body } = await mountModal({ open: false });
    expect(body.find("form").exists()).toBe(false);
  });

  it("shows validation errors when submitting an empty form", async () => {
    const { body } = await mountModal();
    await body.find("form").trigger("submit.prevent");
    expect(body.text()).toContain("Title is required.");
    expect(body.text()).toContain("Description is required.");
    expect(body.text()).toContain("Please select a valid node type.");
  });

  it("emits create with trimmed values when the form is valid", async () => {
    const { wrapper, body } = await mountModal();
    await body.find('input[name="title"]').setValue("  My Title  ");
    await body
      .find('textarea[name="description"]')
      .setValue("  My description  ");
    await wrapper.findComponent({ name: "VSelect" }).setValue("sendMessage");
    await body.find("form").trigger("submit.prevent");

    const emitted = wrapper.emitted("create");
    expect(emitted).toBeTruthy();
    expect(emitted![0][0]).toEqual({
      title: "My Title",
      description: "My description",
      type: "sendMessage",
    });
  });

  it("emits close when the cancel button is clicked", async () => {
    const { wrapper, body } = await mountModal();
    await clickButtonWithText(body, "Cancel");
    expect(wrapper.emitted("close")).toBeTruthy();
  });

  it("labels the modal with the parent node when adding a child", async () => {
    const { body } = await mountModal({ parentTitle: "Business Hours" });
    expect(body.text()).toContain('Add child of "Business Hours"');
  });

  it("uses the generic title when there is no parent", async () => {
    const { body } = await mountModal({ parentTitle: null });
    expect(body.text()).toContain("Create new node");
  });
});
