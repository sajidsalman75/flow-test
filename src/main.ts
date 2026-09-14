import { createApp } from "vue";
import { createPinia } from "pinia";
import {
  VueQueryPlugin,
  type VueQueryPluginOptions,
} from "@tanstack/vue-query";
import App from "./App.vue";
import router from "./router";
import vuetify from "./plugins/vuetify";
import "./style.css";

// Required Query configuration
const vueQueryPluginOptions: VueQueryPluginOptions = {
  queryClientConfig: {
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        networkMode: "always",
        staleTime: Infinity,
        gcTime: 60 * 60 * 1000,
      },
    },
  },
};

const app = createApp(App);

app.use(createPinia());
app.use(router);
app.use(VueQueryPlugin, vueQueryPluginOptions);
app.use(vuetify);

app.mount("#app");
