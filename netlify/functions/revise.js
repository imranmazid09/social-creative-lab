import { generateJson, jsonResponse, readPayload } from "./_shared.js";

export async function handler(event) {
  try {
    const payload = readPayload(event);
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
    "engagementQuestion": "Facebook-only question or empty string",
    "imageConcept": "updated image concept with no visible text",
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
- Proof/support: ${form.proof}
- CTA: ${form.cta}

Rules:
- Preserve factual support. Do not invent proof.
- Keep the image concept free of visible text, typography, captions, logos, or labels.
- Make the revision reflect the student's instruction clearly.`;
}
