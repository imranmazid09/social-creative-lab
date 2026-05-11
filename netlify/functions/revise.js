import { generateJson, jsonResponse, readPayload } from "./_shared.js";

export async function handler(event) {
  try {
    const payload = readPayload(event);
    if (payload.mode === "storyboard") {
      return await handleStoryboardRevision(payload);
    }

    const fallback = {
      demo: true,
      variant: {
        ...payload.selectedVariant,
        caption: `${payload.selectedVariant?.caption || ""}\n\nRevision focus: ${payload.instruction || "Student revision instruction."}`,
        teachingNote: "Revised from the student's instruction."
      },
      revisionNote: `AI revision requested: ${payload.instruction || ""}`
    };

    if (!process.env.GEMINI_API_KEY) {
      return jsonResponse(fallback);
    }

    const generated = await generateJson(buildRevisionPrompt(payload));
    return jsonResponse({
      ...fallback,
      ...generated,
      demo: false
    });
  } catch (error) {
    return jsonResponse({ error: error.message || "Revision failed" }, error.statusCode || 500);
  }
}

async function handleStoryboardRevision(payload) {
  const fallback = buildStoryboardFallback(payload);

  if (!process.env.GEMINI_API_KEY) {
    return jsonResponse(fallback);
  }

  const generated = await generateJson(buildStoryboardRevisionPrompt(payload));
  return jsonResponse({
    ...fallback,
    ...generated,
    storyboard: {
      ...fallback.storyboard,
      ...(generated.storyboard || {})
    },
    demo: false
  });
}

function buildRevisionPrompt(payload) {
  const form = payload.form || {};
  const variant = payload.selectedVariant || {};
  return `You are revising student-generated social media content.

Return only valid JSON matching:
{
  "variant": {
    "title": "Revised version title",
    "hook": "revised hook",
    "caption": "revised caption",
    "cta": "revised CTA",
    "hashtags": ["#tag"],
    "engagementQuestion": "question if requested, otherwise empty string",
    "imageConcept": "Subject: ...\nArtistic Style: ...\nDetails: ...\nComposition: ...\nLighting: ...\nColor: ...",
    "teachingNote": "one sentence explaining what changed"
  },
  "revisionNote": "one sentence summarizing the revision"
}

Student instruction:
${payload.instruction}

Original content:
${JSON.stringify(variant, null, 2)}

Context:
- Platform: ${form.platform}
- Awareness stage: ${form.awarenessStage}
- Format purpose: ${form.formatPurpose}
- Content format: ${form.contentFormat}
- Hook type: ${form.hookType}
- Brand/product: ${form.brand}
- Audience: ${form.audience}
- Key problem or desire: ${form.problem}
- Main benefit: ${form.benefit}
- CTA type: ${form.ctaType}
- Engagement question setting: ${form.engagementQuestion}

Rules:
- Do not invent proof, statistics, endorsements, guarantees, or product facts.
- Generate engagementQuestion only when Engagement question setting is not "No". If it is "No", return an empty string.
- Write imageConcept as six labeled lines: Subject, Artistic Style, Details, Composition, Lighting, Color.
- Keep the image concept free of visible text, typography, captions, logos, or labels.
- Make the revision reflect the student's instruction clearly.`;
}

function buildStoryboardFallback(payload) {
  const storyboard = payload.storyboard || {};
  return {
    demo: true,
    storyboard: {
      title: storyboard.title || "Revised storyboard",
      recommendedLength: storyboard.recommendedLength || "18 seconds",
      pacing: storyboard.pacing || "Keep scenes clear and intentional.",
      audioStyle: storyboard.audioStyle || "Voiceover with simple background audio.",
      scenes: (storyboard.scenes || []).map((scene, index) => ({
        scene: scene.scene || String(index + 1),
        time: scene.time || "",
        visual: scene.visual || "",
        image: scene.image || `Reference image for scene ${index + 1}, no text or logos.`,
        action: scene.action || "",
        audio: scene.audio || "",
        onScreenText: scene.onScreenText || "",
        purpose: scene.purpose || ""
      })),
      buildNotes: `${storyboard.buildNotes || ""}\nImprovement focus: ${payload.instruction || "Student storyboard revision instruction."}`.trim()
    },
    revisionNote: `AI storyboard improvement requested: ${payload.instruction || ""}`
  };
}

function buildStoryboardRevisionPrompt(payload) {
  const form = payload.form || {};
  const storyboard = payload.storyboard || {};
  return `You are revising a TikTok storyboard for an undergraduate social media advertising class.

Return only valid JSON matching:
{
  "storyboard": {
    "title": "Revised storyboard title",
    "recommendedLength": "15s, 30s, or 45s",
    "pacing": "pacing description",
    "audioStyle": "audio or voiceover style",
    "scenes": [
      {
        "scene": "1",
        "time": "0-3s",
        "visual": "what viewer sees",
        "image": "detailed image-generation prompt for this scene, no visible text",
        "action": "what happens",
        "audio": "voiceover or sound cue",
        "onScreenText": "text overlay suggestion only, not for generated image",
        "purpose": "Stop scroll / Build interest / Build trust / Convert"
      }
    ],
    "buildNotes": "Canva/CapCut build guidance"
  },
  "revisionNote": "one sentence summarizing the improvement"
}

Student instruction:
${payload.instruction}

Original storyboard:
${JSON.stringify(storyboard, null, 2)}

Context:
- Platform: ${form.platform}
- Awareness stage: ${form.awarenessStage}
- Format purpose: ${form.formatPurpose}
- Content format: ${form.contentFormat}
- Hook type: ${form.hookType}
- Brand/product: ${form.brand}
- Audience: ${form.audience}
- Key problem or desire: ${form.problem}
- Main benefit: ${form.benefit}
- Caption length: ${form.captionLength}
- Tone: ${form.tone}
- CTA type: ${form.ctaType}

Rules:
- Keep the storyboard useful for TikTok and easy to build in Canva or CapCut.
- Make the revision reflect the student's instruction clearly.
- Include an image field for every scene.
- Image fields should work as detailed image-generation prompts for scene reference images only: include subject, style, details, composition, lighting, color, and restrictions; no visible text, no typography, no labels, no logos, no watermarks.
- Do not invent proof, statistics, endorsements, guarantees, or product facts.
- On-screen text is only a separate editing suggestion and must not be placed inside generated images.`;
}
