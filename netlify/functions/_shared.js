import { GoogleGenAI } from "@google/genai";

export function jsonResponse(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    },
    body: JSON.stringify(body)
  };
}

export function readPayload(event) {
  if (event.httpMethod !== "POST") {
    throw Object.assign(new Error("Method not allowed"), { statusCode: 405 });
  }
  try {
    return JSON.parse(event.body || "{}");
  } catch {
    throw Object.assign(new Error("Invalid JSON body"), { statusCode: 400 });
  }
}

export function getAiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

export async function generateJson(prompt) {
  const ai = getAiClient();
  if (!ai) return null;
  const response = await ai.models.generateContent({
    model: process.env.GEMINI_MODEL || "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json"
    }
  });

  const text = typeof response.text === "function" ? response.text() : response.text;
  return parseJson(text);
}

export function parseJson(text) {
  const cleaned = String(text || "")
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw error;
  }
}

export function cleanText(value) {
  return String(value || "").trim();
}

export function clampNumber(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(parsed, max));
}

export function buildHashtags(form) {
  const count = clampNumber(form.hashtagCount, 0, 0, 12);
  const roots = [
    form.brand,
    form.contentFormat,
    form.platform,
    "creative",
    "marketing",
    "socialmedia",
    "brandstrategy",
    "content"
  ];
  return roots
    .map((item) => cleanText(item).replace(/[^a-z0-9]+/gi, "").toLowerCase())
    .filter(Boolean)
    .slice(0, count)
    .map((item) => `#${item}`);
}

export function mockGenerate(payload) {
  const form = payload.form || {};
  const hook =
    payload.selectedHook ||
    `${form.audience || "Your audience"}, this is the ${String(form.problem || "problem").toLowerCase()} fix you wish you had sooner.`;
  const hookCount = clampNumber(form.hookCount, 3, 1, 10);
  const hooks = Array.from({ length: hookCount }, (_, index) => ({
    text: index === 0 ? hook : `${form.hookType || "Hook"}: ${form.benefit || "a clearer outcome"} without the usual friction.`,
    rationale: `Uses ${String(form.hookType || "hook").toLowerCase()} for a ${String(form.awarenessStage || "selected").toLowerCase()} audience.`
  }));

  if (payload.mode === "hooks") return { demo: true, hooks };

  const variantCount = clampNumber(form.variantCount, 2, 1, 5);
  const variants = Array.from({ length: variantCount }, (_, index) => ({
    title: `Version ${index + 1}`,
    hook: hooks[index % hooks.length].text,
    caption: `${hooks[index % hooks.length].text}\n\n${form.brand || "The brand"} helps ${form.audience || "the audience"} move from "${form.problem || "the problem"}" to "${form.benefit || "the desired benefit"}." The proof point to foreground: ${form.proof || "clear support"}.\n\n${form.cta || "Take the next step."}`,
    cta: form.cta || form.ctaType || "Learn more",
    hashtags: buildHashtags(form),
    engagementQuestion: form.platform === "Facebook" ? "What part of this problem shows up most often for you?" : "",
    imageConcept: `A clean ${String(form.contentFormat || "social").toLowerCase()} visual showing ${form.audience || "the audience"} experiencing the benefit. No visible text in the image.`,
    teachingNote: `Draft uses ${form.contentFormat || "the selected format"} for a ${form.awarenessStage || "selected"} audience.`
  }));

  return {
    demo: true,
    hooks,
    variants,
    storyboard: form.platform === "TikTok" && form.storyboardMode ? mockStoryboard(form) : null,
    imagePrompts: mockImagePrompts(form, variants[0], {
      imageCount: 1,
      aspectRatio: "1:1",
      imageDirection: "Lifestyle scene"
    })
  };
}

export function mockStoryboard(form) {
  return {
    recommendedLength: "18 seconds",
    pacing: "Fast cuts with one clear proof moment",
    audioStyle: "Voiceover with natural product sound underneath",
    scenes: [
      {
        scene: "1",
        time: "0-3s",
        visual: `Show ${form.audience || "the audience"} encountering the problem.`,
        action: "Open on the tension immediately.",
        audio: "Voiceover states the hook.",
        onScreenText: "Short hook phrase",
        purpose: "Stop scroll"
      },
      {
        scene: "2",
        time: "3-7s",
        visual: `Introduce ${form.brand || "the brand"} through the selected format.`,
        action: "Show the mechanism or contrast.",
        audio: "Explain the problem in plain language.",
        onScreenText: "Problem phrase",
        purpose: "Build interest"
      },
      {
        scene: "3",
        time: "7-13s",
        visual: `Show the main benefit: ${form.benefit || "the outcome"}.`,
        action: "Demonstrate the outcome.",
        audio: `Mention proof: ${form.proof || "the support"}.`,
        onScreenText: "Proof phrase",
        purpose: "Build trust"
      },
      {
        scene: "4",
        time: "13-18s",
        visual: "End on the product, user, or final outcome.",
        action: "Make the CTA feel easy.",
        audio: form.cta || "Invite action.",
        onScreenText: "CTA phrase",
        purpose: "Convert"
      }
    ],
    buildNotes: "Build as a vertical 9:16 project. Keep scenes visually simple and add any text overlays later in Canva or CapCut."
  };
}

export function mockImagePrompts(form, variant, settings) {
  const count = clampNumber(settings?.imageCount, 1, 1, 3);
  return Array.from({ length: count }, (_, index) => ({
    title: `Image ${index + 1}: ${settings?.imageDirection || "Image direction"}`,
    prompt: `Create a clean ${settings?.aspectRatio || "1:1"} social media image for ${form.brand || "the brand"}. Direction: ${settings?.imageDirection || "lifestyle scene"}. Support this caption idea: "${variant?.hook || ""}" Visualize ${form.audience || "the audience"} moving from ${form.problem || "the problem"} toward ${form.benefit || "the benefit"}. No visible text, no captions, no typography, no logos, no watermarks.`
  }));
}

export function mockImageResponse(payload) {
  const prompts = mockImagePrompts(payload.form || {}, payload.selectedVariant || {}, payload.settings || {});
  if (payload.mode === "prompts") return { demo: true, imagePrompts: prompts };
  return {
    demo: true,
    imagePrompts: prompts,
    images: prompts.map((prompt, index) => ({
      filename: `mock-social-image-${index + 1}.svg`,
      mimeType: "image/svg+xml",
      dataUrl: mockSvgDataUrl(index, payload.settings?.aspectRatio || "1:1")
    }))
  };
}

function mockSvgDataUrl(index, aspectRatio) {
  const [wRaw, hRaw] = String(aspectRatio || "1:1")
    .split(":")
    .map((part) => Number.parseInt(part, 10));
  const w = Number.isFinite(wRaw) ? wRaw * 240 : 1080;
  const h = Number.isFinite(hRaw) ? hRaw * 240 : 1080;
  const colors = [
    ["#dff3ed", "#f7c59f", "#0f7b63"],
    ["#f6e4c8", "#b9d6f2", "#b94e3b"],
    ["#e9eef0", "#d8b4a0", "#075642"]
  ][index % 3];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${colors[0]}"/><circle cx="${w * 0.25}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.18}" fill="${colors[1]}"/><rect x="${w * 0.42}" y="${h * 0.22}" width="${w * 0.38}" height="${h * 0.48}" rx="18" fill="${colors[2]}" opacity="0.82"/><circle cx="${w * 0.72}" cy="${h * 0.72}" r="${Math.min(w, h) * 0.12}" fill="#ffffff" opacity="0.72"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
