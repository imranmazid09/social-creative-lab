import { getAiClient, generateJson, jsonResponse, mockImageResponse, mockImagePrompts, readPayload } from "./_shared.js";

export async function handler(event) {
  try {
    const payload = readPayload(event);
    const fallback = mockImageResponse(payload);

    if (!process.env.GEMINI_API_KEY) {
      if (payload.mode === "generate") {
        return jsonResponse({ error: "GEMINI_API_KEY is missing. Add it in Netlify environment variables to generate images." }, 500);
      }
      return jsonResponse(fallback);
    }

    if (payload.mode === "prompts") {
      const generated = await generateJson(buildPromptGenerationPrompt(payload));
      return jsonResponse({
        ...fallback,
        ...generated,
        demo: false
      });
    }

    if (payload.mode === "improve-prompts") {
      const generated = await generateJson(buildPromptImprovementPrompt(payload));
      return jsonResponse({
        ...fallback,
        ...generated,
        demo: false
      });
    }

    const prompts = payload.existingPrompts?.length
      ? payload.existingPrompts
      : (await generateJson(buildPromptGenerationPrompt(payload))).imagePrompts ||
        mockImagePrompts(payload.form || {}, payload.selectedVariant || {}, payload.settings || {});

    const ai = getAiClient();
    const imageModels = uniqueModels([process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image-preview", "gemini-2.5-flash-image"]);
    const images = [];

    for (const [index, item] of prompts.entries()) {
      const image = await generateImageWithFallback(ai, imageModels, item, index, payload);
      images.push(image);
    }

    if (!images.length) {
      return jsonResponse({ error: `No image data returned from ${imageModels.join(" or ")}. Check GEMINI_IMAGE_MODEL or remove it to use the default image model.` }, 502);
    }

    return jsonResponse({
      demo: false,
      imagePrompts: prompts,
      images
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "Image generation failed" }, error.statusCode || 500);
  }
}

async function generateImageWithFallback(ai, imageModels, item, index, payload) {
  const errors = [];
  for (const model of imageModels) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: buildImagePrompt(item.prompt, payload),
        config: buildImageConfig(payload)
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((part) => part.inlineData?.data);
      if (imagePart?.inlineData?.data) {
        const mimeType = imagePart.inlineData.mimeType || "image/png";
        const ext = mimeType.includes("jpeg") ? "jpg" : "png";
        return {
          filename: `social-image-${index + 1}.${ext}`,
          mimeType,
          dataUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`
        };
      }
      errors.push(`${model}: no image returned`);
    } catch (error) {
      errors.push(`${model}: ${error.message || "image request failed"}`);
    }
  }
  throw Object.assign(new Error(`Scene ${index + 1} image failed. ${errors.join(" | ")}`), { statusCode: 502 });
}

function uniqueModels(models) {
  return [...new Set(models.map((model) => String(model || "").trim()).filter(Boolean))];
}

function buildPromptGenerationPrompt(payload) {
  const form = payload.form || {};
  const variant = payload.selectedVariant || {};
  const settings = payload.settings || {};
  return `You are writing image-generation prompts for a social media classroom tool.

Return only valid JSON matching:
{
  "imagePrompts": [
    { "title": "Image 1: short direction", "prompt": "complete image generation prompt" }
  ]
}

Create ${settings.imageCount || 1} prompt(s).

Context:
- Platform: ${form.platform}
- Content format: ${form.contentFormat}
- Awareness stage: ${form.awarenessStage}
- Brand/product: ${form.brand}
- Audience: ${form.audience}
- Key problem or desire: ${form.problem}
- Main benefit: ${form.benefit}
- Caption hook: ${variant.hook}
- Caption: ${variant.caption}
- Image direction: ${settings.imageDirection}
- Image direction instruction: ${imageDirectionInstruction(settings.imageDirection, form)}
- Aspect ratio: ${settings.aspectRatio}

Rules:
- The image and caption are separate social media content elements.
- The image must be ready to upload as a standalone Facebook or Instagram image.
- Do not put visible text, words, captions, typography, labels, logos, or watermarks in the image.
- Do not invent proof, statistics, endorsements, guarantees, or product facts.
- Structure each prompt with these labels: Subject, Artistic style, Details, Composition, Lighting, Color, Restrictions.
- Make the image direction visibly different from other directions. Product photo should not look like lifestyle; problem/solution should clearly contrast pain and improvement; behind-the-scenes should show process; educational should explain visually without text.
- Use concrete visual details and production style guidance.`;
}

function buildPromptImprovementPrompt(payload) {
  const form = payload.form || {};
  const settings = payload.settings || {};
  return `You are improving editable image-generation prompts for a social media classroom tool.

Return only valid JSON matching:
{
  "imagePrompts": [
    { "title": "Image 1: short direction", "prompt": "improved complete image generation prompt" }
  ]
}

Student improvement instruction:
${payload.instruction}

Existing prompts:
${JSON.stringify(payload.existingPrompts || [], null, 2)}

Context:
- Platform: ${form.platform}
- Content format: ${form.contentFormat}
- Awareness stage: ${form.awarenessStage}
- Brand/product: ${form.brand}
- Audience: ${form.audience}
- Key problem or desire: ${form.problem}
- Main benefit: ${form.benefit}
- Image direction: ${settings.imageDirection}
- Image direction instruction: ${imageDirectionInstruction(settings.imageDirection, form)}
- Aspect ratio: ${settings.aspectRatio}

Rules:
- Preserve the no-text rule: no visible text, words, captions, typography, labels, logos, or watermarks.
- Keep captions and images separate.
- Do not invent proof, statistics, endorsements, guarantees, or product facts.
- Structure each prompt with these labels: Subject, Artistic style, Details, Composition, Lighting, Color, Restrictions.
- Make the image direction visibly different from other directions. Product photo should not look like lifestyle; problem/solution should clearly contrast pain and improvement; behind-the-scenes should show process; educational should explain visually without text.
- Make the improvement visible and specific.`;
}

function imageDirectionInstruction(direction, form) {
  const value = String(direction || "").toLowerCase();
  const brand = form.brand || "the product";
  const audience = form.audience || "the audience";
  const problem = form.problem || "the problem";
  const benefit = form.benefit || "the benefit";

  if (value.includes("product")) {
    return `Create a product-first commercial photograph with ${brand} as the hero subject, isolated or on a simple surface, minimal human presence, crisp product detail, and a clean background.`;
  }
  if (value.includes("lifestyle")) {
    return `Create a real-life usage scene showing ${audience} naturally using ${brand} in context, with the environment and body language communicating ${benefit}.`;
  }
  if (value.includes("problem") || value.includes("solution")) {
    return `Create a visual contrast between the pain state (${problem}) and the improved state (${benefit}) in one coherent scene, without text labels or split-screen words.`;
  }
  if (value.includes("behind")) {
    return `Create an authentic process-focused image: making, packing, preparing, founder work, workspace, or hands-on detail that builds trust in ${brand}.`;
  }
  if (value.includes("educational")) {
    return `Create a clean explanatory visual that makes the idea understandable through objects, gestures, sequence, or spatial arrangement, but uses no diagrams or text.`;
  }
  if (value.includes("before") || value.includes("after")) {
    return `Create a before-and-after style visual using two clearly different states or moments, showing movement from ${problem} to ${benefit}, with no labels or text.`;
  }
  return `${direction || "Create a strategically relevant visual"} for ${brand}.`;
}

function buildImagePrompt(basePrompt, payload) {
  const settings = payload.settings || {};
  return `${basePrompt}

Aspect ratio: ${settings.aspectRatio || "1:1"}.
Important: no visible text, no captions, no words, no typography, no logos, no labels, no watermarks.`;
}

function buildImageConfig(payload) {
  const aspectRatio = normalizeAspectRatio(payload.settings?.aspectRatio);
  if (!aspectRatio) return {};
  return {
    imageConfig: {
      aspectRatio
    }
  };
}

function normalizeAspectRatio(value) {
  const normalized = String(value || "").trim();
  const supported = new Set(["1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"]);
  return supported.has(normalized) ? normalized : "";
}
