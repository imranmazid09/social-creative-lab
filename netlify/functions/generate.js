import { generateJson, jsonResponse, mockGenerate, readPayload } from "./_shared.js";

export async function handler(event) {
  try {
    const payload = readPayload(event);
    const fallback = mockGenerate(payload);
    const form = payload.form || {};

    if (!process.env.GEMINI_API_KEY) {
      return jsonResponse(fallback);
    }

    const prompt = payload.mode === "hooks" ? buildHookPrompt(form) : buildFullPrompt(form, payload.selectedHook);
    const generated = await generateJson(prompt);

    return jsonResponse({
      ...fallback,
      ...generated,
      demo: false
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "Generation failed" }, error.statusCode || 500);
  }
}

function buildHookPrompt(form) {
  return `You are a senior social media creative strategist teaching undergraduate students.

Return only valid JSON matching:
{
  "hooks": [
    { "text": "hook text", "rationale": "one sentence explaining why it fits" }
  ]
}

Generate ${form.hookCount || 3} hooks.

Rules:
- Platform: ${form.platform}
- Awareness stage: ${form.awarenessStage}
- Format purpose: ${form.formatPurpose}
- Content format: ${form.contentFormat}
- Hook type: ${form.hookType}
- Brand/product: ${form.brand}
- Audience: ${form.audience}
- Key problem or desire: ${form.problem}
- Main benefit: ${form.benefit}
- Make hooks concrete and specific.
- Do not write the full caption.`;
}

function buildFullPrompt(form, selectedHook) {
  const wantsStoryboard = form.platform === "TikTok" && form.storyboardMode;
  return `You are a senior social media creative strategist building a classroom training tool.

Return only valid JSON matching this shape:
{
  "hooks": [
    { "text": "hook text", "rationale": "one sentence" }
  ],
  "variants": [
    {
      "title": "Version 1",
      "hook": "hook text",
      "caption": "platform-ready caption",
      "cta": "call to action",
      "hashtags": ["#tag"],
      "engagementQuestion": "question if requested, otherwise empty string",
      "imageConcept": "Subject: ...\nArtistic Style: ...\nDetails: ...\nComposition: ...\nLighting: ...\nColor: ...",
      "teachingNote": "short note explaining the strategic choice"
    }
  ],
  "storyboard": null,
  "storyboards": [],
  "imagePrompts": [
    { "title": "Image 1", "prompt": "image prompt with no visible text" }
  ]
}

If storyboard is requested, return both storyboard and storyboards. Storyboards must contain one storyboard per requested variant. The storyboard field should duplicate the first item in storyboards. Each storyboard must use:
{
  "title": "Storyboard 1",
  "recommendedLength": "15s, 30s, or 45s",
  "pacing": "pacing description",
  "audioStyle": "audio or voiceover style",
  "scenes": [
    {
      "scene": "1",
      "time": "0-3s",
      "visual": "what viewer sees",
      "image": "reference image description for this scene, no text in image",
      "action": "what happens",
      "audio": "voiceover or sound cue",
      "onScreenText": "text overlay suggestion only, not for generated image",
      "purpose": "Stop scroll / Build interest / Build trust / Convert"
    }
  ],
  "buildNotes": "Canva/CapCut build guidance"
}

Inputs:
- Platform: ${form.platform}
- Awareness stage: ${form.awarenessStage}
- Format purpose: ${form.formatPurpose}
- Content format: ${form.contentFormat}
- Hook type: ${form.hookType}
- Selected hook to consider: ${selectedHook || "None selected"}
- Brand/product: ${form.brand}
- Audience: ${form.audience}
- Key problem or desire: ${form.problem}
- Main benefit: ${form.benefit}
- Number of variants: ${form.variantCount}
- Caption length: ${form.captionLength}
- Tone: ${form.tone}
- Emoji level: ${form.emojiLevel}
- Hashtag count: ${form.hashtagCount}
- CTA type: ${form.ctaType}
- Engagement question setting: ${form.engagementQuestion}
- Storyboard requested: ${wantsStoryboard ? "yes" : "no"}

Platform requirements:
- Facebook: include hook, caption, CTA, and imageConcept.
- Instagram: include first-line hook as hook, caption, hashtags, CTA, imageConcept, and mention feed/reel/carousel fit in teachingNote.
- TikTok: include 3-second hook as hook, caption, hashtags, CTA, visual concept, and storyboard if requested.
- For TikTok storyboard mode: create ${form.variantCount || 2} distinct storyboard variations that reflect the output controls, content format, hook type, caption length, tone, and CTA type.
- Storyboard scenes must include an image field that describes the associated storyboard reference image for that scene. Images must be clean visual references with no text, typography, labels, logos, or watermarks.
- Generate engagementQuestion only when Engagement question setting is not "No". If it is "No", return an empty string.

Content rules:
- Use the selected content format intentionally.
- Do not invent proof, statistics, endorsements, guarantees, or product facts.
- Write imageConcept as six labeled lines: Subject, Artistic Style, Details, Composition, Lighting, Color.
- Keep generated image concepts and image prompts free of visible text, captions, typography, logos, and labels.
- Captions and images are separate assets.`;
}
