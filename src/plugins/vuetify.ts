import "vuetify/styles";
import "@mdi/font/css/materialdesignicons.css";
import { createVuetify } from "vuetify";

export default createVuetify({
  icons: {
    defaultSet: "mdi",
  },
  theme: {
    defaultTheme: "flowChartTheme",
    themes: {
      flowChartTheme: {
        dark: false,
        colors: {
          primary: "#0f766e",
          secondary: "#475467",
          error: "#d92d20",
          success: "#15803d",
          warning: "#b45309",
          background: "#f4f5f7",
          surface: "#ffffff",
        },
      },
    },
  },
  defaults: {
    VTextField: {
      variant: "outlined",
      density: "comfortable",
      hideDetails: "auto",
    },
    VTextarea: {
      variant: "outlined",
      density: "comfortable",
      hideDetails: "auto",
    },
    VSelect: {
      variant: "outlined",
      density: "comfortable",
      hideDetails: "auto",
    },
    VBtn: { rounded: "lg" },
  },
});
