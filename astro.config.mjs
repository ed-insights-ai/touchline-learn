// @ts-check
import starlight from "@astrojs/starlight";
import { defineConfig } from "astro/config";

// Published as a GitHub Pages project site:
// https://ed-insights-ai.github.io/touchline-learn/
export default defineConfig({
  site: "https://ed-insights-ai.github.io",
  base: "/touchline-learn",
  trailingSlash: "always",
  redirects: { "/start/platform/": "/touchline-learn/practice/follow-one-match/" },
  integrations: [
    starlight({
      title: "Touchline Learn",
      description:
        "A teaching guide to a working data platform: collection, provenance, identity, contracts, gates, derived products and where AI fits, with runnable labs.",
      favicon: "/favicon.svg",
      customCss: ["./src/styles/theme.css"],
      components: {
        MarkdownContent: "./src/components/JourneyContent.astro",
        PageFrame: "./src/components/overrides/PageFrame.astro",
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/ed-insights-ai/touchline-learn",
        },
      ],
      sidebar: [
        { label: "Overview", link: "/" },
        { label: "Modules", items: [{ autogenerate: { directory: "modules" } }] },
        { label: "Finish", items: ["finish/back-to-the-agent"] },
        { label: "Guide, labs and data", items: ["start/how-to-use", "start/setup", "start/sample-data"] },
        { label: "Practice", items: [{ autogenerate: { directory: "practice" } }] },
        { label: "Teaching", items: [{ autogenerate: { directory: "teaching" } }] },
        { label: "Reference", items: [{ autogenerate: { directory: "reference" } }] },
      ],
    }),
  ],
});
