// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// Published as a GitHub Pages project site:
// https://ed-insights-ai.github.io/touchline-learn/
export default defineConfig({
  site: "https://ed-insights-ai.github.io",
  base: "/touchline-learn",
  trailingSlash: "always",
  integrations: [
    starlight({
      title: "Touchline Learn",
      description:
        "A teaching guide to a working data platform: collection, provenance, identity, contracts, gates, derived products and where AI fits, with runnable labs.",
      favicon: "/favicon.svg",
      customCss: ["./src/styles/theme.css"],
      components: { MarkdownContent: "./src/components/JourneyContent.astro" },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/ed-insights-ai/touchline-learn",
        },
      ],
      sidebar: [
        { label: "Overview", link: "/" },
        { label: "Start here", items: ["start/how-to-use", "start/platform"] },
        { label: "Modules", items: [{ autogenerate: { directory: "modules" } }] },
        { label: "Finish", items: ["finish/back-to-the-agent"] },
        { label: "Labs and data", items: ["start/setup", "start/sample-data"] },
        { label: "Practice", items: [{ autogenerate: { directory: "practice" } }] },
        { label: "Teaching", items: [{ autogenerate: { directory: "teaching" } }] },
        { label: "Reference", items: [{ autogenerate: { directory: "reference" } }] },
      ],
    }),
  ],
});
