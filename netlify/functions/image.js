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
- Aspect ratio: ${settings.aspectRatio}

Rules:
- The image and caption are separate social media content elements.
- The image must be ready to upload as a standalone Facebook or Instagram image.
- Do not put visible text, words, captions, typography, labels, logos, or watermarks in the image.
- Do not invent proof, statistics, endorsements, guarantees, or product facts.
- Structure each prompt with these labels: Subject, Artistic style, Details, Composition, Lighting, Color, Restrictions.
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
- Aspect ratio: ${settings.aspectRatio}

Rules:
- Preserve the no-text rule: no visible text, words, captions, typography, labels, logos, or watermarks.
- Keep captions and images separate.
- Do not invent proof, statistics, endorsements, guarantees, or product facts.
- Structure each prompt with these labels: Subject, Artistic style, Details, Composition, Lighting, Color, Restrictions.
- Make the improvement visible and specific.`;
}

function buildImagePrompt(basePrompt, payload) {
  const settings = payload.settings || {};
  return `${basePrompt}

Aspect ratio: ${settings.aspectRatio || "1:1"}.
Important: no visible text, no captions, no words, no typography, no logos, no labels, no watermarks.`;
}
