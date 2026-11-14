import { brandInput, contentInput } from "./core.ts";
import type { openStore } from "./core.ts";

export function seedWorkspace(store: ReturnType<typeof openStore>) {
  if (!store.all("meta").length) {
    const brand = store.save(
      "brand",
      brandInput({
        name: "Form & Field",
        website: "",
        description:
          "Everyday objects, thoughtfully made. Small-batch ceramics for slower mornings and a home that feels like you.",
        product: "Handcrafted ceramic mugs, bowls, and vases",
        audience:
          "Design-conscious people who value craft, calm, and everyday rituals",
        voice: "Warm, considered, quietly playful. Short sentences. No hype.",
        colors: ["#cb6877", "#334f43"],
        source: "Editable example brand",
      }),
    );
    for (const item of [
      {
        title: "The slow morning collection",
        headline: "Make room for\nslow mornings.",
        kind: "Social post",
        channel: "Instagram",
        body: "The first sip. The quiet kitchen. A mug that fits just right.\n\nMeet the everyday pieces that make ordinary moments feel a little more yours.\n\nExplore our small-batch ceramics.",
        cta: "Find your everyday",
        layout: 0,
        color: "#cb6877",
      },
      {
        title: "Objects with a little soul",
        headline: "A little imperfect.\nEntirely yours.",
        kind: "Ad creative",
        channel: "Facebook",
        body: "Made by hand, meant to be held. Discover small-batch ceramics from Form & Field.\n\nAdd product link before publishing.",
        cta: "Meet the collection",
        layout: 1,
        color: "#334f43",
      },
      {
        title: "A note from the studio",
        headline: "Good things\ntake shape.",
        kind: "Email",
        channel: "Email",
        body: "Subject: A little something from our studio\nPreview: Meet your new daily ritual.\n\nHello,\n\nWe believe the things you use every day should feel special. Our latest collection brings a little care to your morning routine.\n\nExplore our handcrafted mugs, bowls, and vases.\n\nForm & Field\n\n[Add address and unsubscribe link.]",
        cta: "Take a closer look",
        layout: 2,
        color: "#d8a267",
      },
      {
        title: "Your everyday ritual",
        headline: "Less rush.\nMore ritual.",
        kind: "Social post",
        channel: "Instagram",
        body: "Some things are worth slowing down for.\n\nA warm cup, an open window, and a moment that belongs to you.\n\nWhat does your morning ritual look like?",
        cta: "Make it a ritual",
        layout: 3,
        color: "#9aaec2",
      },
    ])
      store.save(
        "content",
        contentInput(
          {
            ...item,
            brandId: brand.id,
            status: "Draft",
            source: "Example template",
          },
          [brand.id],
        ),
      );
    store.save("meta", { initialized: true });
  }
}
