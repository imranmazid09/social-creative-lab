const form = document.querySelector("#labForm");
const saveStatus = document.querySelector("#saveStatus");
const generateHooksBtn = document.querySelector("#generateHooksBtn");
const generateBtn = document.querySelector("#generateBtn");
const resetBtn = document.querySelector("#resetBtn");
const hookOptions = document.querySelector("#hookOptions");
const generatedContent = document.querySelector("#generatedContent");
const variantList = document.querySelector("#variantList");
const revisionPanel = document.querySelector("#revisionPanel");
const manualCaption = document.querySelector("#manualCaption");
const revisionInstruction = document.querySelector("#revisionInstruction");
const reviseBtn = document.querySelector("#reviseBtn");
const saveManualBtn = document.querySelector("#saveManualBtn");
const storyboardPanel = document.querySelector("#storyboardPanel");
const storyboardOutput = document.querySelector("#storyboardOutput");
const storyboardToggleWrap = document.querySelector("#storyboardToggleWrap");
const imagePanel = document.querySelector("#imagePanel");
const imagePromptBtn = document.querySelector("#imagePromptBtn");
const imageGenerateBtn = document.querySelector("#imageGenerateBtn");
const savePromptsBtn = document.querySelector("#savePromptsBtn");
const improvePromptsBtn = document.querySelector("#improvePromptsBtn");
const imagePromptInstruction = document.querySelector("#imagePromptInstruction");
const imageOutput = document.querySelector("#imageOutput");
const downloadPanel = document.querySelector("#downloadPanel");
const downloadCaptionBtn = document.querySelector("#downloadCaptionBtn");
const downloadStoryboardBtn = document.querySelector("#downloadStoryboardBtn");
const downloadPromptsBtn = document.querySelector("#downloadPromptsBtn");
const downloadPackageBtn = document.querySelector("#downloadPackageBtn");
const formatGuidance = document.querySelector("#formatGuidance");

const STORAGE_KEY = "socialCreativeLabDraft";

const state = {
  hooks: [],
  selectedHook: "",
  result: null,
  selectedVariantIndex: 0,
  imagePrompts: [],
  images: []
};

const formatNotes = {
  Testimonial: {
    bestFor: "Building trust with skeptical audiences and high-consideration purchases.",
    fit: "Solution-aware and product-aware.",
    strategy: "Let the customer tell the story. Spend real time on the before state before revealing the after."
  },
  Demo: {
    bestFor: "Tactile or visual products where seeing is believing.",
    fit: "Problem-aware and product-aware.",
    strategy: "Show, do not over-explain. Let the visual proof carry the claim."
  },
  Listicle: {
    bestFor: "Products with multiple features or several pain points.",
    fit: "Unaware and problem-aware.",
    strategy: "Front-load the strongest reason. Each list item should stand alone as a reason to care."
  },
  Montage: {
    bestFor: "Lifestyle brands that need desire, vibe, and emotional pull.",
    fit: "Product-aware and most-aware.",
    strategy: "Keep copy minimal and let pacing, scenes, and mood create the feeling."
  },
  "Split screen": {
    bestFor: "Comparisons, before/after moments, and challenger brands.",
    fit: "Solution-aware.",
    strategy: "Use the visual contrast as the proof. Avoid over-explaining."
  },
  "Behind the scenes": {
    bestFor: "Founder-led brands, craftsmanship, or skeptical categories.",
    fit: "Problem-aware and solution-aware.",
    strategy: "Keep it authentic. Over-production can weaken the trust signal."
  },
  "Tutorial / How-to": {
    bestFor: "Products with a learning curve or multi-step routines.",
    fit: "Problem-aware.",
    strategy: "Teach first, sell second. Lead with the desired outcome."
  },
  Unboxing: {
    bestFor: "Premium products, subscriptions, and elevated packaging.",
    fit: "Product-aware.",
    strategy: "Build anticipation and focus on specific details that reduce purchase anxiety."
  }
};

const awarenessRecommendations = {
  Unaware: "Recommended formats: Listicle, Tutorial / How-to, Demo. The job is to educate and reveal the problem.",
  "Problem-aware": "Recommended formats: Listicle, Tutorial / How-to, Demo, Testimonial, Behind the scenes. The job is to make the pain clear and credible.",
  "Solution-aware": "Recommended formats: Demo, Split screen, Testimonial, Behind the scenes. The job is to compare and demonstrate.",
  "Product-aware": "Recommended formats: Testimonial, Demo, Unboxing, Split screen. The job is to prove the product is worth choosing.",
  "Most-aware": "Recommended formats: Montage, Testimonial, offer-focused Demo. The job is to create action."
};

document.querySelectorAll("[data-other]").forEach((select) => {
  const input = document.getElementById(select.dataset.other);
  const sync = () => {
    if (!input) return;
    const show = select.value === "Other";
    input.style.display = show ? "block" : "none";
    input.required = show && select.closest("form") === form;
  };
  select.addEventListener("change", () => {
    sync();
    persistDraft();
    updateConditionalUi();
  });
  sync();
});

form.addEventListener("input", persistDraft);
form.addEventListener("change", () => {
  updateFormatGuidance();
  persistDraft();
});

generateHooksBtn.addEventListener("click", async () => {
  await withLoading(generateHooksBtn, async () => {
    const payload = collectPayload("hooks");
    const data = await postJson("/.netlify/functions/generate", payload, () => mockGenerate(payload));
    state.hooks = data.hooks || [];
    state.selectedHook = state.hooks[0]?.text || "";
    renderHooks();
    setStatus(data.demo ? "Mock hooks ready" : "Hooks ready");
  });
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!form.reportValidity()) return;
  await withLoading(generateBtn, async () => {
    const payload = collectPayload("full");
    const data = await postJson("/.netlify/functions/generate", payload, () => mockGenerate(payload));
    state.result = normalizeResult(data);
    state.selectedVariantIndex = 0;
    state.imagePrompts = [];
    state.images = [];
    renderGeneratedContent();
    renderStoryboard();
    renderImageOutput();
    generatedContent.hidden = false;
    revisionPanel.hidden = false;
    imagePanel.hidden = false;
    downloadPanel.hidden = false;
    setStatus(data.demo ? "Mock content ready" : "Content ready");
    generatedContent.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

resetBtn.addEventListener("click", () => {
  form.reset();
  localStorage.removeItem(STORAGE_KEY);
  state.hooks = [];
  state.selectedHook = "";
  state.result = null;
  state.selectedVariantIndex = 0;
  state.imagePrompts = [];
  state.images = [];
  imagePromptInstruction.value = "";
  hookOptions.innerHTML = "";
  [generatedContent, revisionPanel, storyboardPanel, imagePanel, downloadPanel].forEach((el) => {
    el.hidden = true;
  });
  document.querySelectorAll(".other-input").forEach((input) => {
    input.style.display = "none";
    input.required = false;
  });
  updateConditionalUi();
  updateFormatGuidance();
  setStatus("Reset");
});

saveManualBtn.addEventListener("click", () => {
  const variant = selectedVariant();
  if (!variant) return;
  variant.caption = manualCaption.value.trim();
  variant.revisionNote = "Manually edited by student.";
  renderGeneratedContent();
  setStatus("Manual edit saved");
});

reviseBtn.addEventListener("click", async () => {
  const variant = selectedVariant();
  const instruction = revisionInstruction.value.trim();
  if (!variant || !instruction) {
    revisionInstruction.focus();
    setStatus("Add revision instruction");
    return;
  }
  await withLoading(reviseBtn, async () => {
    const payload = {
      form: collectPayload("revise").form,
      selectedVariant: variant,
      instruction
    };
    const data = await postJson("/.netlify/functions/revise", payload, () => mockRevise(payload));
    state.result.variants[state.selectedVariantIndex] = {
      ...variant,
      ...(data.variant || {}),
      revisionNote: data.revisionNote || `Revised using: ${instruction}`
    };
    manualCaption.value = state.result.variants[state.selectedVariantIndex].caption || "";
    renderGeneratedContent();
    setStatus(data.demo ? "Mock revision ready" : "Revision ready");
  });
});

imagePromptBtn.addEventListener("click", async () => {
  const variant = selectedVariant();
  if (!variant) return;
  await withLoading(imagePromptBtn, async () => {
    const payload = collectImagePayload("prompts");
    const data = await postJson("/.netlify/functions/image", payload, () => mockImage(payload));
    state.imagePrompts = data.imagePrompts || [];
    renderImageOutput();
    setStatus(data.demo ? "Mock prompts ready" : "Image prompts ready");
  });
});

savePromptsBtn.addEventListener("click", () => {
  syncPromptEdits();
  setStatus("Prompt edits saved");
});

improvePromptsBtn.addEventListener("click", async () => {
  const variant = selectedVariant();
  if (!variant) return;
  syncPromptEdits();
  const instruction = imagePromptInstruction.value.trim();
  if (!state.imagePrompts.length) {
    setStatus("Generate prompts first");
    return;
  }
  if (!instruction) {
    imagePromptInstruction.focus();
    setStatus("Add prompt instruction");
    return;
  }
  await withLoading(improvePromptsBtn, async () => {
    const payload = {
      ...collectImagePayload("improve-prompts"),
      instruction
    };
    const data = await postJson("/.netlify/functions/image", payload, () => mockImage(payload));
    state.imagePrompts = data.imagePrompts || state.imagePrompts;
    renderImageOutput();
    setStatus(data.demo ? "Mock prompt improvement ready" : "Prompts improved");
  });
});

imageGenerateBtn.addEventListener("click", async () => {
  const variant = selectedVariant();
  if (!variant) return;
  syncPromptEdits();
  await withLoading(imageGenerateBtn, async () => {
    const payload = collectImagePayload("generate");
    const data = await postJson("/.netlify/functions/image", payload, () => mockImage(payload));
    state.imagePrompts = data.imagePrompts || state.imagePrompts;
    state.images = data.images || [];
    renderImageOutput();
    setStatus(data.demo ? "Mock image previews ready" : "Images ready");
  });
});

downloadCaptionBtn.addEventListener("click", () => {
  downloadText("caption.md", buildCaptionMarkdown(), "text/markdown");
});

downloadStoryboardBtn.addEventListener("click", () => {
  downloadText("storyboard.md", buildStoryboardMarkdown(), "text/markdown");
});

downloadPromptsBtn.addEventListener("click", () => {
  downloadText("image-prompts.md", buildImagePromptsMarkdown(), "text/markdown");
});

downloadPackageBtn.addEventListener("click", downloadPackage);

restoreDraft();
updateConditionalUi();
updateFormatGuidance();

function collectPayload(mode) {
  const data = new FormData(form);
  const formValues = {
    platform: choice(data, "platform", "platformOther"),
    awarenessStage: choice(data, "awarenessStage", "awarenessOther"),
    formatPurpose: choice(data, "formatPurpose", "formatPurposeOther"),
    contentFormat: choice(data, "contentFormat", "contentFormatOther"),
    hookType: choice(data, "hookType", "hookTypeOther"),
    hookCount: numberChoice(data, "hookCount", "hookCountOther", 3, 10),
    brand: value(data, "brand"),
    audience: value(data, "audience"),
    problem: value(data, "problem"),
    benefit: value(data, "benefit"),
    variantCount: numberChoice(data, "variantCount", "variantCountOther", 2, 5),
    captionLength: choice(data, "captionLength", "captionLengthOther"),
    tone: choice(data, "tone", "toneOther"),
    emojiLevel: choice(data, "emojiLevel", "emojiOther"),
    hashtagCount: numberChoice(data, "hashtagCount", "hashtagOther", 0, 12),
    ctaType: choice(data, "ctaType", "ctaTypeOther"),
    engagementQuestion: choice(data, "engagementQuestion", "engagementQuestionOther"),
    storyboardMode: data.get("storyboardMode") === "on"
  };

  return {
    mode,
    form: formValues,
    selectedHook: selectedHookText()
  };
}

function collectImagePayload(mode) {
  const formValues = collectPayload("image").form;
  const count = resolveStandaloneNumber("imageCount", "imageCountOther", 1, 3);
  return {
    mode,
    form: formValues,
    selectedVariant: selectedVariant(),
    settings: {
      imageCount: count,
      aspectRatio: resolveStandaloneChoice("aspectRatio", "aspectOther"),
      imageDirection: resolveStandaloneChoice("imageDirection", "imageDirectionOther")
    },
    existingPrompts: state.imagePrompts
  };
}

function choice(data, field, otherField) {
  const raw = value(data, field);
  if (raw === "Other") return value(data, otherField) || "Other";
  return raw;
}

function numberChoice(data, field, otherField, fallback, max) {
  const raw = choice(data, field, otherField);
  const parsed = Number.parseInt(raw, 10);
  if (Number.isFinite(parsed)) return Math.max(0, Math.min(parsed, max));
  return fallback;
}

function value(data, field) {
  return String(data.get(field) || "").trim();
}

function resolveStandaloneChoice(selectId, otherId) {
  const select = document.getElementById(selectId);
  const other = document.getElementById(otherId);
  if (select.value === "Other") return other.value.trim() || "Other";
  return select.value;
}

function resolveStandaloneNumber(selectId, otherId, fallback, max) {
  const parsed = Number.parseInt(resolveStandaloneChoice(selectId, otherId), 10);
  if (Number.isFinite(parsed)) return Math.max(1, Math.min(parsed, max));
  return fallback;
}

async function postJson(url, payload, fallbackFactory) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Request failed with ${response.status}`);
    return await response.json();
  } catch (error) {
    console.warn(error);
    return fallbackFactory();
  }
}

function normalizeResult(data) {
  return {
    hooks: data.hooks || [],
    variants: data.variants || [],
    storyboard: data.storyboard || null,
    imagePrompts: data.imagePrompts || []
  };
}

function renderHooks() {
  hookOptions.innerHTML = "";
  if (!state.hooks.length) return;

  state.hooks.forEach((hook, index) => {
    const label = document.createElement("label");
    label.className = "hook-option";
    const radio = document.createElement("input");
    radio.type = "radio";
    radio.name = "hookOption";
    radio.checked = index === 0;
    radio.addEventListener("change", () => {
      state.selectedHook = hook.text;
      setStatus("Hook selected");
    });
    const content = document.createElement("div");
    content.innerHTML = `<strong>${escapeHtml(hook.text)}</strong><span>${escapeHtml(hook.rationale || "")}</span>`;
    label.append(radio, content);
    hookOptions.append(label);
  });
}

function selectedHookText() {
  const checkedIndex = [...document.querySelectorAll("[name='hookOption']")].findIndex((input) => input.checked);
  if (checkedIndex >= 0 && state.hooks[checkedIndex]) return state.hooks[checkedIndex].text;
  return state.selectedHook;
}

function renderGeneratedContent() {
  variantList.innerHTML = "";
  if (!state.result?.variants?.length) return;
  const template = document.querySelector("#variantTemplate");
  const platform = collectPayload("view").form.platform;

  state.result.variants.forEach((variant, index) => {
    const node = template.content.firstElementChild.cloneNode(true);
    const radio = node.querySelector("[name='selectedVariant']");
    radio.checked = index === state.selectedVariantIndex;
    radio.addEventListener("change", () => {
      state.selectedVariantIndex = index;
      manualCaption.value = selectedVariant()?.caption || "";
      renderGeneratedContent();
      renderStoryboard();
      renderImageOutput();
    });
    if (index === state.selectedVariantIndex) node.classList.add("selected");
    node.querySelector(".variant-title").textContent = variant.title || `Version ${index + 1}`;
    node.querySelector(".variant-meta").textContent = platform;
    node.querySelector(".variant-hook").textContent = variant.hook || "";
    node.querySelector(".variant-caption").textContent = variant.caption || "";
    node.querySelector(".variant-cta").textContent = variant.cta || "";
    node.querySelector(".variant-hashtags").textContent = hashtagsText(variant.hashtags);
    node.querySelector(".variant-engagement").textContent = variant.engagementQuestion || "";
    node.querySelector(".variant-image").textContent = formatImageConcept(variant.imageConcept);
    node.querySelector(".variant-note").textContent = variant.teachingNote || variant.revisionNote || "";

    if (!variant.engagementQuestion) node.querySelector(".engagement-block").hidden = true;
    if (!variant.hashtags?.length && !variant.hashtags) node.querySelector(".hashtags-block").hidden = true;
    variantList.append(node);
  });

  manualCaption.value = selectedVariant()?.caption || "";
}

function renderStoryboard() {
  const storyboard = state.result?.storyboard;
  if (!storyboard) {
    storyboardPanel.hidden = true;
    storyboardOutput.innerHTML = "";
    return;
  }
  storyboardPanel.hidden = false;
  const scenes = storyboard.scenes || [];
  storyboardOutput.innerHTML = `
    <div class="storyboard-meta">
      <div><h3>Length</h3><p>${escapeHtml(storyboard.recommendedLength || "")}</p></div>
      <div><h3>Pacing</h3><p>${escapeHtml(storyboard.pacing || "")}</p></div>
      <div><h3>Audio</h3><p>${escapeHtml(storyboard.audioStyle || "")}</p></div>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Scene</th>
            <th>Time</th>
            <th>Visual</th>
            <th>Action</th>
            <th>Audio / Voiceover</th>
            <th>On-Screen Text</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          ${scenes
            .map(
              (scene, index) => `
            <tr>
              <td>${escapeHtml(scene.scene || String(index + 1))}</td>
              <td>${escapeHtml(scene.time || "")}</td>
              <td>${escapeHtml(scene.visual || "")}</td>
              <td>${escapeHtml(scene.action || "")}</td>
              <td>${escapeHtml(scene.audio || "")}</td>
              <td>${escapeHtml(scene.onScreenText || "")}</td>
              <td>${escapeHtml(scene.purpose || "")}</td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <div class="output-block">
      <h3>Build Notes</h3>
      <p>${escapeHtml(storyboard.buildNotes || "")}</p>
    </div>
  `;
}

function renderImageOutput() {
  imageOutput.innerHTML = "";
  if (state.imagePrompts.length) {
    state.imagePrompts.forEach((prompt, index) => {
      const card = document.createElement("article");
      card.className = "prompt-card";
      card.innerHTML = `
        <h3>${escapeHtml(prompt.title || `Image Prompt ${index + 1}`)}</h3>
        <label>
          Editable image prompt
          <textarea class="prompt-textarea" data-prompt-index="${index}">${escapeHtml(prompt.prompt || "")}</textarea>
        </label>
      `;
      imageOutput.append(card);
    });
    imageOutput.querySelectorAll(".prompt-textarea").forEach((textarea) => {
      textarea.addEventListener("input", () => {
        const index = Number(textarea.dataset.promptIndex);
        if (state.imagePrompts[index]) state.imagePrompts[index].prompt = textarea.value;
      });
    });
  }

  if (state.images.length) {
    const grid = document.createElement("div");
    grid.className = "image-grid";
    state.images.forEach((image, index) => {
      const card = document.createElement("article");
      card.className = "image-card";
      card.innerHTML = `
        <img alt="Generated social media image ${index + 1}" src="${image.dataUrl}" />
        <div class="button-row">
          <button type="button" class="secondary" data-download-image="${index}">Download Image ${index + 1}</button>
        </div>
      `;
      grid.append(card);
    });
    imageOutput.append(grid);
    imageOutput.querySelectorAll("[data-download-image]").forEach((button) => {
      button.addEventListener("click", () => {
        const image = state.images[Number(button.dataset.downloadImage)];
        downloadDataUrl(image.dataUrl, image.filename || "social-image.png");
      });
    });
  }

  if (!state.imagePrompts.length && !state.images.length) {
    imageOutput.innerHTML = `<div class="notice">No image prompt has been generated yet. Click Generate Image Prompts when the caption is ready.</div>`;
  }
}

function syncPromptEdits() {
  imageOutput.querySelectorAll(".prompt-textarea").forEach((textarea) => {
    const index = Number(textarea.dataset.promptIndex);
    if (state.imagePrompts[index]) state.imagePrompts[index].prompt = textarea.value.trim();
  });
}

function selectedVariant() {
  return state.result?.variants?.[state.selectedVariantIndex] || null;
}

function updateConditionalUi() {
  const platform = collectPayload("view").form.platform;
  const isTikTok = platform.toLowerCase().includes("tiktok");
  storyboardToggleWrap.hidden = !isTikTok;
  if (!isTikTok) {
    const checkbox = storyboardToggleWrap.querySelector("input");
    checkbox.checked = false;
  }
}

function updateFormatGuidance() {
  const data = new FormData(form);
  const awareness = choice(data, "awarenessStage", "awarenessOther");
  const format = choice(data, "contentFormat", "contentFormatOther");
  const note = formatNotes[format];
  const recommendation = awarenessRecommendations[awareness];
  const pieces = [];
  if (recommendation) pieces.push(`<div><strong>Awareness fit:</strong> ${escapeHtml(recommendation)}</div>`);
  if (note) {
    pieces.push(`<div><strong>Best for:</strong> ${escapeHtml(note.bestFor)}</div>`);
    pieces.push(`<div><strong>Audience fit:</strong> ${escapeHtml(note.fit)}</div>`);
    pieces.push(`<div><strong>Messaging strategy:</strong> ${escapeHtml(note.strategy)}</div>`);
  }
  if (!pieces.length) {
    pieces.push("<div><strong>Custom setup:</strong> Use the output controls and content inputs to make the selected format concrete.</div>");
  }
  formatGuidance.innerHTML = pieces.join("");
}

async function withLoading(button, task) {
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Working...";
  document.body.classList.add("loading");
  setStatus("Working");
  try {
    await task();
  } catch (error) {
    console.error(error);
    setStatus("Error");
    showError(error.message || "Something went wrong.");
  } finally {
    button.disabled = false;
    button.textContent = original;
    document.body.classList.remove("loading");
  }
}

function showError(message) {
  const error = document.createElement("div");
  error.className = "notice error";
  error.textContent = message;
  generatedContent.hidden = false;
  variantList.prepend(error);
}

function setStatus(text) {
  saveStatus.textContent = text;
}

function persistDraft() {
  const payload = {};
  new FormData(form).forEach((fieldValue, key) => {
    payload[key] = fieldValue;
  });
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  setStatus("Draft saved");
}

function restoreDraft() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const payload = JSON.parse(raw);
    Object.entries(payload).forEach(([key, fieldValue]) => {
      const field = form.elements[key];
      if (!field) return;
      if (field.type === "checkbox") {
        field.checked = fieldValue === "on" || fieldValue === true;
      } else {
        field.value = fieldValue;
      }
    });
    document.querySelectorAll("[data-other]").forEach((select) => {
      select.dispatchEvent(new Event("change"));
    });
    setStatus("Draft restored");
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function hashtagsText(hashtags) {
  if (Array.isArray(hashtags)) return hashtags.join(" ");
  return hashtags || "";
}

function buildCaptionMarkdown() {
  const variant = selectedVariant();
  if (!variant) return "# Caption\n\nNo caption generated yet.\n";
  const formValues = collectPayload("download").form;
  return `# ${variant.title || "Social Caption"}

Platform: ${formValues.platform}
Format: ${formValues.contentFormat}
Awareness Stage: ${formValues.awarenessStage}

## Hook
${variant.hook || ""}

## Caption
${variant.caption || ""}

## CTA
${variant.cta || ""}

## Hashtags
${hashtagsText(variant.hashtags)}

## Image Concept
${formatImageConcept(variant.imageConcept)}

## Notes
${variant.teachingNote || variant.revisionNote || ""}
`;
}

function buildStoryboardMarkdown() {
  const storyboard = state.result?.storyboard;
  if (!storyboard) return "# Storyboard\n\nNo storyboard generated yet.\n";
  const rows = (storyboard.scenes || [])
    .map(
      (scene) =>
        `| ${scene.scene || ""} | ${scene.time || ""} | ${scene.visual || ""} | ${scene.action || ""} | ${scene.audio || ""} | ${scene.onScreenText || ""} | ${scene.purpose || ""} |`
    )
    .join("\n");
  return `# TikTok Storyboard

Recommended length: ${storyboard.recommendedLength || ""}
Pacing: ${storyboard.pacing || ""}
Audio style: ${storyboard.audioStyle || ""}

| Scene | Time | Visual | Action | Audio / Voiceover | On-Screen Text | Purpose |
|---|---|---|---|---|---|---|
${rows}

## Build Notes
${storyboard.buildNotes || ""}
`;
}

function buildImagePromptsMarkdown() {
  if (!state.imagePrompts.length) return "# Image Prompts\n\nNo image prompts generated yet.\n";
  return `# Image Prompts

${state.imagePrompts
  .map((prompt, index) => `## ${prompt.title || `Image Prompt ${index + 1}`}\n${prompt.prompt || ""}`)
  .join("\n\n")}
`;
}

function downloadText(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

async function downloadPackage() {
  const payload = {
    form: collectPayload("download").form,
    selectedVariant: selectedVariant(),
    storyboard: state.result?.storyboard || null,
    imagePrompts: state.imagePrompts,
    images: state.images,
    exportedAt: new Date().toISOString()
  };

  if (!window.JSZip) {
    downloadText("social-creative-lab-package.json", JSON.stringify(payload, null, 2), "application/json");
    return;
  }

  const zip = new window.JSZip();
  zip.file("caption.md", buildCaptionMarkdown());
  zip.file("storyboard.md", buildStoryboardMarkdown());
  zip.file("image-prompts.md", buildImagePromptsMarkdown());
  zip.file("platform-output.json", JSON.stringify(payload, null, 2));

  state.images.forEach((image, index) => {
    const base64 = image.dataUrl.split(",")[1];
    const ext = image.mimeType?.includes("jpeg") ? "jpg" : "png";
    zip.file(`image-${index + 1}.${ext}`, base64, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "social-creative-lab-package.zip";
  link.click();
  URL.revokeObjectURL(url);
}

function mockGenerate(payload) {
  const formValues = payload.form;
  const hook =
    payload.selectedHook ||
    `${formValues.audience || "Your audience"}, this is the ${(formValues.problem || "problem").toLowerCase()} fix you wish you had sooner.`;
  const hooks = Array.from({ length: formValues.hookCount || 3 }, (_, index) => ({
    text: index === 0 ? hook : `${formValues.hookType}: ${formValues.benefit || "a clearer outcome"} without the usual friction.`,
    rationale: `Uses ${(formValues.hookType || "hook").toLowerCase()} to match a ${(formValues.awarenessStage || "selected").toLowerCase()} audience.`
  }));

  if (payload.mode === "hooks") return { demo: true, hooks };

  const variants = Array.from({ length: formValues.variantCount || 2 }, (_, index) => ({
    title: `Version ${index + 1}`,
    hook: hooks[index % hooks.length].text,
    caption: `${hooks[index % hooks.length].text}\n\n${formValues.brand || "The brand"} helps ${formValues.audience || "the audience"} move from "${formValues.problem || "the problem"}" toward "${formValues.benefit || "the desired benefit"}."\n\n${formValues.ctaType || "Learn more"}.`,
    cta: formValues.ctaType || "Learn more",
    hashtags: buildMockHashtags(formValues),
    engagementQuestion: shouldIncludeEngagement(formValues) ? "What part of this problem shows up most often for you?" : "",
    imageConcept: buildMockImageConcept(formValues),
    teachingNote: `Draft uses ${formValues.contentFormat || "the selected format"} for a ${formValues.awarenessStage || "selected"} audience.`
  }));

  return {
    demo: true,
    hooks,
    variants,
    storyboard: formValues.platform === "TikTok" && formValues.storyboardMode ? mockStoryboard(formValues) : null,
    imagePrompts: mockImagePrompts(formValues, variants[0], { imageCount: 1, aspectRatio: "1:1", imageDirection: "Lifestyle scene" })
  };
}

function mockRevise(payload) {
  return {
    demo: true,
    variant: {
      ...payload.selectedVariant,
      caption: `${payload.selectedVariant.caption}\n\nRevision focus: ${payload.instruction}`,
      teachingNote: "Revised from the student's instruction."
    },
    revisionNote: `AI revision requested: ${payload.instruction}`
  };
}

function mockImage(payload) {
  const prompts = mockImagePrompts(payload.form, payload.selectedVariant, payload.settings);
  if (payload.mode === "prompts") return { demo: true, imagePrompts: prompts };
  if (payload.mode === "improve-prompts") {
    return {
      demo: true,
      imagePrompts: (payload.existingPrompts || prompts).map((prompt) => ({
        ...prompt,
        prompt: `${prompt.prompt}\nImprovement focus: ${payload.instruction}`
      }))
    };
  }
  return {
    demo: true,
    imagePrompts: payload.existingPrompts?.length ? payload.existingPrompts : prompts,
    images: (payload.existingPrompts?.length ? payload.existingPrompts : prompts).map((prompt, index) => ({
      filename: `mock-social-image-${index + 1}.svg`,
      mimeType: "image/svg+xml",
      dataUrl: mockSvgDataUrl(index, payload.settings.aspectRatio)
    }))
  };
}

function mockImagePrompts(formValues, variant, settings) {
  const count = settings.imageCount || 1;
  return Array.from({ length: count }, (_, index) => ({
    title: `Image ${index + 1}: ${settings.imageDirection}`,
    prompt: `Subject: ${formValues.audience || "the audience"} experiencing ${formValues.benefit || "the benefit"} for ${formValues.brand || "the brand"}.
Artistic style: polished editorial social media photography, natural and believable.
Details: ${settings.imageDirection}; support the caption hook "${variant?.hook || ""}" without adding words.
Composition: ${settings.aspectRatio} crop, clear focal subject, uncluttered background.
Lighting: natural, flattering, platform-ready.
Color: balanced, brand-neutral colors with enough contrast for social feeds.
Restrictions: no visible text, no captions, no typography, no logos, no watermarks.`
  }));
}

function buildMockImageConcept(formValues) {
  return [
    `Subject: ${formValues.audience || "The target audience"} interacting with ${formValues.brand || "the brand"} in a way that makes the benefit visible.`,
    "Artistic Style: Clean editorial social photography, realistic and not over-produced.",
    `Details: Use the ${formValues.contentFormat || "selected"} format to show the problem-to-benefit movement.`,
    "Composition: Clear focal subject, simple background, enough negative space for later Canva edits if needed.",
    "Lighting: Natural, flattering, and bright enough for mobile feeds.",
    "Color: Balanced colors that feel credible and platform-native."
  ].join("\n");
}

function mockStoryboard(formValues) {
  return {
    recommendedLength: "18 seconds",
    pacing: "Fast cuts with one clear benefit moment",
    audioStyle: "Voiceover with natural product sound underneath",
    scenes: [
      {
        scene: "1",
        time: "0-3s",
        visual: `Show ${formValues.audience} encountering the problem.`,
        action: "Open on the tension immediately.",
        audio: "Voiceover states the hook.",
        onScreenText: "Short hook phrase",
        purpose: "Stop scroll"
      },
      {
        scene: "2",
        time: "3-7s",
        visual: `Introduce ${formValues.brand} through the ${formValues.contentFormat.toLowerCase()} format.`,
        action: "Show the mechanism or contrast.",
        audio: "Explain the problem in plain language.",
        onScreenText: "Problem phrase",
        purpose: "Build interest"
      },
      {
        scene: "3",
        time: "7-13s",
        visual: `Show the main benefit: ${formValues.benefit}.`,
        action: "Demonstrate the outcome.",
        audio: `Make the benefit concrete: ${formValues.benefit}.`,
        onScreenText: "Benefit phrase",
        purpose: "Build trust"
      },
      {
        scene: "4",
        time: "13-18s",
        visual: "End on the product, user, or final outcome.",
        action: "Make the CTA feel easy.",
        audio: formValues.ctaType,
        onScreenText: "CTA phrase",
        purpose: "Convert"
      }
    ],
    buildNotes: "Build as a vertical 9:16 project. Keep each scene visually simple and add any text overlays in Canva or CapCut."
  };
}

function buildMockHashtags(formValues) {
  const count = Number(formValues.hashtagCount) || 0;
  if (!count) return [];
  const base = ["#socialmedia", "#creative", "#marketing", "#smallbusiness", "#brandstrategy", "#contentmarketing", "#tiktokmarketing", "#instagrammarketing"];
  return base.slice(0, count);
}

function formatImageConcept(imageConcept) {
  if (!imageConcept) return "";
  if (typeof imageConcept === "string") return imageConcept;
  const labels = [
    ["subject", "Subject"],
    ["artisticStyle", "Artistic Style"],
    ["details", "Details"],
    ["composition", "Composition"],
    ["lighting", "Lighting"],
    ["color", "Color"]
  ];
  return labels
    .map(([key, label]) => (imageConcept[key] ? `${label}: ${imageConcept[key]}` : ""))
    .filter(Boolean)
    .join("\n");
}

function shouldIncludeEngagement(formValues) {
  return String(formValues.engagementQuestion || "No").toLowerCase() !== "no";
}

function mockSvgDataUrl(index, aspectRatio) {
  const [wRaw, hRaw] = String(aspectRatio || "1:1").split(":").map((part) => Number.parseInt(part, 10));
  const w = Number.isFinite(wRaw) ? wRaw * 240 : 1080;
  const h = Number.isFinite(hRaw) ? hRaw * 240 : 1080;
  const colors = [
    ["#dff3ed", "#f7c59f", "#0f7b63"],
    ["#f6e4c8", "#b9d6f2", "#b94e3b"],
    ["#e9eef0", "#d8b4a0", "#075642"]
  ][index % 3];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="${w}" height="${h}" fill="${colors[0]}"/><circle cx="${w * 0.25}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.18}" fill="${colors[1]}"/><rect x="${w * 0.42}" y="${h * 0.22}" width="${w * 0.38}" height="${h * 0.48}" rx="18" fill="${colors[2]}" opacity="0.82"/><circle cx="${w * 0.72}" cy="${h * 0.72}" r="${Math.min(w, h) * 0.12}" fill="#ffffff" opacity="0.72"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

function escapeHtml(valueToEscape) {
  return String(valueToEscape)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
