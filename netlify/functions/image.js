import { getAiClient, generateJson, jsonResponse, mockImageResponse, mockImagePrompts, readPayload } from "./_shared.js";

export async function handler(event) {
  try {
    const payload = readPayload(event);
    const fallback = mockImageResponse(payload);

    if (!process.env.GEMINI_API_KEY) {
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
    const images = [];
    const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

    for (const [index, item] of prompts.entries()) {
      const response = await ai.models.generateContent({
        model: imageModel,
        contents: buildImagePrompt(item.prompt, payload)
      });

      const parts = response.candidates?.[0]?.content?.parts || [];
      const imagePart = parts.find((part) => part.inlineData?.data);
      if (imagePart?.inlineData?.data) {
        const mimeType = imagePart.inlineData.mimeType || "image/png";
        const ext = mimeType.includes("jpeg") ? "jpg" : "png";
        images.push({
          filename: `social-image-${index + 1}.${ext}`,
          mimeType,
          dataUrl: `data:${mimeType};base64,${imagePart.inlineData.data}`
        });
      }
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
