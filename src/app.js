const form = document.querySelector("#labForm");
const newSessionBtn = document.querySelector("#newSessionBtn");
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
const storyboardEditor = document.querySelector("#storyboardEditor");
const storyboardToggleWrap = document.querySelector("#storyboardToggleWrap");
const storyboardModeInput = document.querySelector("[name='storyboardMode']");
const storyboardInstruction = document.querySelector("#storyboardInstruction");
const saveStoryboardBtn = document.querySelector("#saveStoryboardBtn");
const improveStoryboardBtn = document.querySelector("#improveStoryboardBtn");
const imagePanel = document.querySelector("#imagePanel");
const imagePromptBtn = document.querySelector("#imagePromptBtn");
const imageGenerateBtn = document.querySelector("#imageGenerateBtn");
const savePromptsBtn = document.querySelector("#savePromptsBtn");
const improvePromptsBtn = document.querySelector("#improvePromptsBtn");
const resetImageBtn = document.querySelector("#resetImageBtn");
const imagePromptInstruction = document.querySelector("#imagePromptInstruction");
const imageSettingsNotice = document.querySelector("#imageSettingsNotice");
const imageOutput = document.querySelector("#imageOutput");
const downloadPanel = document.querySelector("#downloadPanel");
const downloadCaptionBtn = document.querySelector("#downloadCaptionBtn");
const downloadStoryboardBtn = document.querySelector("#downloadStoryboardBtn");
const downloadPromptsBtn = document.querySelector("#downloadPromptsBtn");
const downloadPackageBtn = document.querySelector("#downloadPackageBtn");
const formatGuidance = document.querySelector("#formatGuidance");

const state = {
  hooks: [],
  selectedHook: "",
  result: null,
  selectedVariantIndex: 0,
  selectedStoryboardIndex: 0,
  imagePrompts: [],
  images: [],
  storyboardImages: {},
  storyboardImageSignatures: {},
  storyboardImagesLoading: {}
};

let storyboardChoiceTouched = false;

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
    updateConditionalUi();
  });
  sync();
});

form.addEventListener("change", () => {
  updateFormatGuidance();
});

storyboardModeInput.addEventListener("change", () => {
  storyboardChoiceTouched = true;
});

generateHooksBtn.addEventListener("click", async () => {
  if (!validateHookPrereqs()) return;
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
    const isTikTok = isTikTokPlatform();
    const data = await postJson("/.netlify/functions/generate", payload, () => mockGenerate(payload));
    state.result = normalizeResult(data);
    state.selectedVariantIndex = 0;
    state.selectedStoryboardIndex = 0;
    state.imagePrompts = [];
    state.images = [];
    state.storyboardImages = {};
    state.storyboardImageSignatures = {};
    state.storyboardImagesLoading = {};
    renderGeneratedContent();
    renderStoryboard();
    renderImageOutput();
    generatedContent.hidden = isTikTok;
    revisionPanel.hidden = isTikTok;
    imagePanel.hidden = isTikTok;
    downloadPanel.hidden = false;
    syncDownloadControls();

    if (isTikTok) {
      await generateStoryboardImagesForCurrent();
      renderStoryboard();
      setStatus(data.demo ? "Mock TikTok storyboard ready" : "TikTok storyboard ready");
      storyboardPanel.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }

    setStatus(data.demo ? "Mock content ready" : "Content ready");
    generatedContent.scrollIntoView({ behavior: "smooth", block: "start" });
  });
});

resetBtn.addEventListener("click", () => {
  resetSession();
});

newSessionBtn.addEventListener("click", () => {
  resetSession();
});

function resetSession() {
  form.reset();
  localStorage.removeItem("socialCreativeLabDraft");
  state.hooks = [];
  state.selectedHook = "";
  state.result = null;
  state.selectedVariantIndex = 0;
  state.selectedStoryboardIndex = 0;
  state.imagePrompts = [];
  state.images = [];
  state.storyboardImages = {};
  state.storyboardImageSignatures = {};
  state.storyboardImagesLoading = {};
  storyboardChoiceTouched = false;
  storyboardInstruction.value = "";
  imagePromptInstruction.value = "";
  hookOptions.innerHTML = "";
  [generatedContent, revisionPanel, storyboardPanel, imagePanel, downloadPanel].forEach((el) => {
    el.hidden = true;
  });
  document.querySelectorAll(".other-input").forEach((input) => {
    input.style.display = "none";
    input.required = false;
  });
  resetImageAsset();
  updateConditionalUi();
  updateFormatGuidance();
  setStatus("Ready");
}

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

saveStoryboardBtn.addEventListener("click", () => {
  withLoading(saveStoryboardBtn, async () => {
    syncStoryboardEdits();
    clearStoryboardImagesForCurrent();
    renderStoryboard();
    await generateStoryboardImagesForCurrent({ force: true });
    renderStoryboard();
    setStatus("Storyboard edits saved");
  });
});

improveStoryboardBtn.addEventListener("click", async () => {
  const storyboard = currentStoryboard();
  const instruction = storyboardInstruction.value.trim();
  if (!storyboard) {
    setStatus("Generate storyboard first");
    return;
  }
  if (!instruction) {
    storyboardInstruction.focus();
    setStatus("Add storyboard instruction");
    return;
  }
  syncStoryboardEdits();
  await withLoading(improveStoryboardBtn, async () => {
    const payload = {
      mode: "storyboard",
      form: collectPayload("storyboard").form,
      storyboard: currentStoryboard(),
      instruction
    };
    const data = await postJson("/.netlify/functions/revise", payload, () => mockStoryboardRevise(payload));
    const storyboards = getStoryboards();
    storyboards[state.selectedStoryboardIndex] = data.storyboard || storyboards[state.selectedStoryboardIndex];
    state.result.storyboards = storyboards;
    state.result.storyboard = storyboards[0] || null;
    clearStoryboardImagesForCurrent();
    renderStoryboard();
    await generateStoryboardImagesForCurrent({ force: true });
    renderStoryboard();
    setStatus(data.demo ? "Mock storyboard improvement ready" : "Storyboard improved");
  });
});

imagePromptBtn.addEventListener("click", async () => {
  const variant = selectedVariant();
  if (!variant) return;
  await withLoading(imagePromptBtn, async () => {
    const payload = collectImagePayload("prompts");
    const data = await postJson("/.netlify/functions/image", payload, () => mockImage(payload));
    state.imagePrompts = data.imagePrompts || [];
    state.images = [];
    markImageSettingsDirty(false);
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
    markImageSettingsDirty(false);
    renderImageOutput();
    setStatus(data.demo ? "Mock image previews ready" : "Images ready");
  });
});

resetImageBtn.addEventListener("click", () => {
  resetImageAsset();
  setStatus("Image asset reset");
});

document.querySelectorAll("#imageCount, #aspectRatio, #imageDirection, #imageCountOther, #aspectOther, #imageDirectionOther").forEach((field) => {
  field.addEventListener("change", () => markImageSettingsDirty(Boolean(state.imagePrompts.length || state.images.length)));
  field.addEventListener("input", () => markImageSettingsDirty(Boolean(state.imagePrompts.length || state.images.length)));
});

downloadCaptionBtn.addEventListener("click", () => {
  downloadText("caption.txt", buildCaptionText(), "text/plain");
});

downloadStoryboardBtn.addEventListener("click", () => {
  downloadText("storyboard.txt", buildStoryboardText(), "text/plain");
});

downloadPromptsBtn.addEventListener("click", () => {
  downloadText("image-prompts.txt", buildImagePromptsText(), "text/plain");
});

downloadPackageBtn.addEventListener("click", downloadPackage);

localStorage.removeItem("socialCreativeLabDraft");
updateConditionalUi();
updateFormatGuidance();
setStatus("Ready");

function collectPayload(mode) {
  const data = new FormData(form);
  const platform = choice(data, "platform", "platformOther");
  const formValues = {
    platform,
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
    storyboardMode: platform.toLowerCase().includes("tiktok") || data.get("storyboardMode") === "on"
  };

  return {
    mode,
    form: formValues,
    selectedHook: selectedHookText()
  };
}

function validateHookPrereqs() {
  const requiredNames = [
    "platform",
    "awarenessStage",
    "formatPurpose",
    "contentFormat",
    "brand",
    "audience",
    "problem",
    "benefit",
    "hookType",
    "hookCount"
  ];

  for (const name of requiredNames) {
    const field = form.elements[name];
    if (field && !field.reportValidity()) return false;
    const otherId = field?.dataset?.other;
    if (field?.value === "Other" && otherId) {
      const otherField = document.getElementById(otherId);
      if (otherField && !otherField.reportValidity()) return false;
    }
  }
  return true;
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
  const storyboards = data.storyboards || (data.storyboard ? [data.storyboard] : []);
  return {
    hooks: data.hooks || [],
    variants: data.variants || [],
    storyboard: storyboards[0] || null,
    storyboards,
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
  const storyboards = getStoryboards();
  const storyboard = currentStoryboard();
  if (!storyboard) {
    storyboardPanel.hidden = true;
    storyboardOutput.innerHTML = "";
    storyboardEditor.innerHTML = "";
    return;
  }
  storyboardPanel.hidden = false;
  const scenes = storyboard.scenes || [];
  storyboardOutput.innerHTML = `
    ${
      storyboards.length > 1
        ? `<div class="storyboard-options">
          ${storyboards
            .map(
              (item, index) => `
              <label class="storyboard-option">
                <input type="radio" name="selectedStoryboard" data-storyboard-index="${index}" ${index === state.selectedStoryboardIndex ? "checked" : ""} />
                ${escapeHtml(item.title || `Storyboard ${index + 1}`)}
              </label>`
            )
            .join("")}
        </div>`
        : ""
    }
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
            <th>Image</th>
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
              <td>${renderStoryboardImageCell(index, scene)}</td>
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
  storyboardOutput.querySelectorAll("[data-storyboard-index]").forEach((radio) => {
    radio.addEventListener("change", () => {
      syncStoryboardEdits();
      state.selectedStoryboardIndex = Number(radio.dataset.storyboardIndex);
      state.selectedVariantIndex = state.selectedStoryboardIndex;
      renderStoryboard();
      generateStoryboardImagesForCurrent()
        .then(() => renderStoryboard())
        .catch((error) => {
          console.error(error);
          setStatus("Storyboard image generation failed");
        });
    });
  });
  storyboardOutput.querySelectorAll("[data-download-storyboard-image]").forEach((button) => {
    button.addEventListener("click", () => {
      const image = storyboardImagesForCurrent()[Number(button.dataset.downloadStoryboardImage)];
      if (image?.dataUrl) downloadDataUrl(image.dataUrl, image.filename || "tiktok-storyboard-scene.png");
    });
  });
  renderStoryboardEditor(storyboard);
}

function renderStoryboardImageCell(index, scene) {
  const image = storyboardImagesForCurrent()[index];
  const isLoading = Boolean(state.storyboardImagesLoading[storyboardImageKey()]);
  if (image?.dataUrl) {
    return `
      <figure class="storyboard-image">
        <img alt="Storyboard scene ${escapeAttribute(scene.scene || String(index + 1))}" src="${image.dataUrl}" />
        <figcaption>Scene ${escapeHtml(scene.scene || String(index + 1))}</figcaption>
        <button type="button" class="secondary small-button" data-download-storyboard-image="${index}">Download</button>
      </figure>
    `;
  }

  return `<div class="storyboard-image-placeholder">${isLoading ? "Generating image..." : "Image will appear here."}</div>`;
}

function renderStoryboardEditor(storyboard) {
  const scenes = storyboard.scenes || [];
  storyboardEditor.innerHTML = `
    <div class="form-grid compact">
      <label>
        Recommended length
        <input data-storyboard-field="recommendedLength" value="${escapeAttribute(storyboard.recommendedLength || "")}" />
      </label>
      <label>
        Pacing
        <input data-storyboard-field="pacing" value="${escapeAttribute(storyboard.pacing || "")}" />
      </label>
      <label>
        Audio style
        <input data-storyboard-field="audioStyle" value="${escapeAttribute(storyboard.audioStyle || "")}" />
      </label>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Scene</th>
            <th>Time</th>
            <th>Visual</th>
            <th>Image prompt</th>
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
              <td><input data-scene-index="${index}" data-scene-field="scene" value="${escapeAttribute(scene.scene || String(index + 1))}" /></td>
              <td><textarea data-scene-index="${index}" data-scene-field="time">${escapeHtml(scene.time || "")}</textarea></td>
              <td><textarea data-scene-index="${index}" data-scene-field="visual">${escapeHtml(scene.visual || "")}</textarea></td>
              <td><textarea data-scene-index="${index}" data-scene-field="image">${escapeHtml(scene.image || "")}</textarea></td>
              <td><textarea data-scene-index="${index}" data-scene-field="action">${escapeHtml(scene.action || "")}</textarea></td>
              <td><textarea data-scene-index="${index}" data-scene-field="audio">${escapeHtml(scene.audio || "")}</textarea></td>
              <td><textarea data-scene-index="${index}" data-scene-field="onScreenText">${escapeHtml(scene.onScreenText || "")}</textarea></td>
              <td><textarea data-scene-index="${index}" data-scene-field="purpose">${escapeHtml(scene.purpose || "")}</textarea></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <label>
      Build Notes
      <textarea data-storyboard-field="buildNotes">${escapeHtml(storyboard.buildNotes || "")}</textarea>
    </label>
  `;
}

function getStoryboards() {
  if (!state.result) return [];
  if (Array.isArray(state.result.storyboards) && state.result.storyboards.length) return state.result.storyboards;
  return state.result.storyboard ? [state.result.storyboard] : [];
}

function currentStoryboard() {
  return getStoryboards()[state.selectedStoryboardIndex] || null;
}

function storyboardImageKey() {
  return String(state.selectedStoryboardIndex);
}

function storyboardImagesForCurrent() {
  return state.storyboardImages[storyboardImageKey()] || [];
}

function clearStoryboardImagesForCurrent() {
  const key = storyboardImageKey();
  delete state.storyboardImages[key];
  delete state.storyboardImageSignatures[key];
  delete state.storyboardImagesLoading[key];
}

function storyboardScenePrompts(storyboard) {
  return (storyboard?.scenes || []).map((scene, index) => ({
    title: `Storyboard ${state.selectedStoryboardIndex + 1}, Scene ${scene.scene || index + 1}`,
    prompt: `Subject: ${scene.image || scene.visual || `Scene ${index + 1}`}.
Artistic style: realistic vertical TikTok storyboard frame, polished but natural social media photography.
Details: Scene context: ${scene.visual || ""} Action: ${scene.action || ""} Audio direction: ${scene.audio || ""}.
Composition: 9:16 vertical frame, clear focal subject, enough context to understand the scene without text.
Lighting: natural, mobile-first, visually clear.
Color: balanced and platform-ready.
Restrictions: no visible text, no words, no typography, no captions, no logos, no labels, no watermarks.`
  }));
}

function storyboardPromptSignature(prompts) {
  return prompts.map((prompt) => prompt.prompt).join("\n---\n");
}

async function generateStoryboardImagesForCurrent({ force = false } = {}) {
  if (!isTikTokPlatform()) return;
  const storyboard = currentStoryboard();
  if (!storyboard) return;

  const prompts = storyboardScenePrompts(storyboard);
  if (!prompts.length) return;

  const key = storyboardImageKey();
  const signature = storyboardPromptSignature(prompts);
  if (!force && state.storyboardImageSignatures[key] === signature && storyboardImagesForCurrent().length === prompts.length) return;

  state.storyboardImagesLoading[key] = true;
  renderStoryboard();
  const payload = {
    mode: "generate",
    form: collectPayload("storyboard-images").form,
    selectedVariant: state.result?.variants?.[state.selectedStoryboardIndex] || selectedVariant() || {},
    settings: {
      imageCount: prompts.length,
      aspectRatio: "9:16",
      imageDirection: "TikTok storyboard scene"
    },
    existingPrompts: prompts
  };
  try {
    const data = await postJson("/.netlify/functions/image", payload, () => mockImage(payload));
    state.storyboardImages[key] = (data.images || []).map((image, index) => {
      const ext = image.mimeType?.includes("jpeg") ? "jpg" : image.mimeType?.includes("svg") ? "svg" : "png";
      return {
        ...image,
        title: prompts[index]?.title || `Scene ${index + 1}`,
        prompt: prompts[index]?.prompt || "",
        filename: `tiktok-storyboard-${Number(key) + 1}-scene-${index + 1}.${ext}`
      };
    });
    state.storyboardImageSignatures[key] = signature;
  } finally {
    state.storyboardImagesLoading[key] = false;
  }
}

function syncStoryboardEdits() {
  const storyboard = currentStoryboard();
  if (!storyboard) return;

  storyboardEditor.querySelectorAll("[data-storyboard-field]").forEach((field) => {
    storyboard[field.dataset.storyboardField] = field.value.trim();
  });

  storyboard.scenes = storyboard.scenes || [];
  storyboardEditor.querySelectorAll("[data-scene-index][data-scene-field]").forEach((field) => {
    const index = Number(field.dataset.sceneIndex);
    const key = field.dataset.sceneField;
    storyboard.scenes[index] = storyboard.scenes[index] || {};
    storyboard.scenes[index][key] = field.value.trim();
  });

  const storyboards = getStoryboards();
  storyboards[state.selectedStoryboardIndex] = storyboard;
  state.result.storyboards = storyboards;
  state.result.storyboard = storyboards[0] || null;
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

function resetImageAsset() {
  state.imagePrompts = [];
  state.images = [];
  imagePromptInstruction.value = "";
  markImageSettingsDirty(false);
  renderImageOutput();
}

function markImageSettingsDirty(isDirty) {
  imagePanel.dataset.settingsDirty = isDirty ? "true" : "false";
  imageSettingsNotice.hidden = !isDirty;
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
  const isTikTok = isTikTokPlatform();
  storyboardToggleWrap.hidden = !isTikTok;
  storyboardModeInput.disabled = isTikTok;
  if (isTikTok) {
    storyboardModeInput.checked = true;
    imagePanel.hidden = true;
    if (state.result) {
      generatedContent.hidden = true;
      revisionPanel.hidden = true;
    }
  } else {
    storyboardModeInput.checked = false;
    storyboardModeInput.disabled = false;
    storyboardChoiceTouched = false;
  }
  syncDownloadControls();
}

function isTikTokPlatform() {
  return collectPayload("view").form.platform.toLowerCase().includes("tiktok");
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
  newSessionBtn.dataset.status = text;
}

function syncDownloadControls() {
  const isTikTok = isTikTokPlatform();
  downloadCaptionBtn.hidden = isTikTok;
  downloadPromptsBtn.hidden = isTikTok;
}

function hashtagsText(hashtags) {
  if (Array.isArray(hashtags)) return hashtags.join(" ");
  return hashtags || "";
}

function buildCaptionText() {
  const variant = selectedVariant();
  if (!variant) return "Caption\n\nNo caption generated yet.\n";
  const formValues = collectPayload("download").form;
  return `${variant.title || "Social Caption"}

Platform: ${formValues.platform}
Format: ${formValues.contentFormat}
Awareness Stage: ${formValues.awarenessStage}

Hook
${variant.hook || ""}

Caption
${variant.caption || ""}

CTA
${variant.cta || ""}

Hashtags
${hashtagsText(variant.hashtags)}

Image Concept
${formatImageConcept(variant.imageConcept)}

Notes
${variant.teachingNote || variant.revisionNote || ""}
`;
}

function buildStoryboardText() {
  syncStoryboardEdits();
  const storyboards = getStoryboards();
  if (!storyboards.length) return "Storyboard\n\nNo storyboard generated yet.\n";
  return storyboards
    .map((storyboard, storyboardIndex) => {
      const rows = (storyboard.scenes || [])
        .map(
          (scene) =>
            `Scene ${scene.scene || ""}\nTime: ${scene.time || ""}\nVisual: ${scene.visual || ""}\nImage: ${scene.image || ""}\nAction: ${scene.action || ""}\nAudio / Voiceover: ${scene.audio || ""}\nOn-screen text suggestion: ${scene.onScreenText || ""}\nPurpose: ${scene.purpose || ""}`
        )
        .join("\n\n");
      return `TikTok Storyboard ${storyboardIndex + 1}: ${storyboard.title || ""}

Recommended length: ${storyboard.recommendedLength || ""}
Pacing: ${storyboard.pacing || ""}
Audio style: ${storyboard.audioStyle || ""}

${rows}

Build Notes
${storyboard.buildNotes || ""}
`;
    })
    .join("\n\n---\n\n");
}

function buildImagePromptsText() {
  if (!state.imagePrompts.length) return "Image Prompts\n\nNo image prompts generated yet.\n";
  return `Image Prompts

${state.imagePrompts
  .map((prompt, index) => `${prompt.title || `Image Prompt ${index + 1}`}\n${prompt.prompt || ""}`)
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
  const isTikTok = isTikTokPlatform();

  if (!window.JSZip) {
    downloadText(isTikTok ? "storyboard.txt" : "caption.txt", isTikTok ? buildStoryboardText() : buildCaptionText(), "text/plain");
    return;
  }

  const zip = new window.JSZip();
  zip.file("storyboard.txt", buildStoryboardText());
  if (!isTikTok) {
    zip.file("caption.txt", buildCaptionText());
    zip.file("image-prompts.txt", buildImagePromptsText());
  }

  state.images.forEach((image, index) => {
    const base64 = image.dataUrl.split(",")[1];
    const ext = image.mimeType?.includes("jpeg") ? "jpg" : "png";
    zip.file(`image-${index + 1}.${ext}`, base64, { base64: true });
  });

  storyboardImagesForPackage().forEach(({ image, storyboardIndex, sceneIndex }) => {
    const base64 = image.dataUrl.split(",")[1];
    const ext = image.mimeType?.includes("jpeg") ? "jpg" : image.mimeType?.includes("svg") ? "svg" : "png";
    zip.file(`tiktok-storyboard-${storyboardIndex + 1}-scene-${sceneIndex + 1}.${ext}`, base64, { base64: true });
  });

  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "social-creative-lab-package.zip";
  link.click();
  URL.revokeObjectURL(url);
}

function storyboardImagesForPackage() {
  return Object.entries(state.storyboardImages).flatMap(([storyboardIndex, images]) =>
    (images || []).map((image, sceneIndex) => ({
      image,
      storyboardIndex: Number(storyboardIndex),
      sceneIndex
    }))
  );
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

  const storyboards =
    formValues.platform === "TikTok" && formValues.storyboardMode
      ? Array.from({ length: formValues.variantCount || 2 }, (_, index) => mockStoryboard(formValues, index, variants[index]))
      : [];

  return {
    demo: true,
    hooks,
    variants,
    storyboard: storyboards[0] || null,
    storyboards,
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

function mockStoryboardRevise(payload) {
  return {
    demo: true,
    storyboard: {
      ...payload.storyboard,
      buildNotes: `${payload.storyboard?.buildNotes || ""}\nImprovement focus: ${payload.instruction}`,
      scenes: (payload.storyboard?.scenes || []).map((scene) => ({
        ...scene,
        image: scene.image || `Reference image for ${scene.visual || "this scene"}`
      }))
    },
    revisionNote: `AI storyboard improvement requested: ${payload.instruction}`
  };
}

function mockImagePrompts(formValues, variant, settings) {
  const count = settings.imageCount || 1;
  const direction = imageDirectionInstruction(settings.imageDirection, formValues);
  return Array.from({ length: count }, (_, index) => ({
    title: `Image ${index + 1}: ${settings.imageDirection}`,
    prompt: `Subject: ${formValues.audience || "the audience"} experiencing ${formValues.benefit || "the benefit"} for ${formValues.brand || "the brand"}.
Artistic style: polished editorial social media photography, natural and believable.
Details: ${direction} Support the caption hook "${variant?.hook || ""}" without adding words.
Composition: ${settings.aspectRatio} crop, clear focal subject, uncluttered background.
Lighting: natural, flattering, platform-ready.
Color: balanced, brand-neutral colors with enough contrast for social feeds.
Restrictions: no visible text, no captions, no typography, no logos, no watermarks.`
  }));
}

function imageDirectionInstruction(direction, formValues) {
  const value = String(direction || "").toLowerCase();
  const brand = formValues.brand || "the product";
  const audience = formValues.audience || "the audience";
  const problem = formValues.problem || "the problem";
  const benefit = formValues.benefit || "the benefit";

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

function mockStoryboard(formValues, index = 0, variant = null) {
  return {
    title: `Storyboard ${index + 1}`,
    recommendedLength: "18 seconds",
    pacing: index % 2 === 0 ? "Fast cuts with one clear benefit moment" : "Slower problem-to-solution sequence with a clear final payoff",
    audioStyle: index % 2 === 0 ? "Voiceover with natural product sound underneath" : "Conversational voiceover with light background music",
    scenes: [
      {
        scene: "1",
        time: "0-3s",
        visual: index % 2 === 0 ? `Show ${formValues.audience} encountering the problem.` : `Open with a close-up of the moment ${formValues.audience} feels the problem.`,
        image: `Reference image: ${formValues.audience} in the problem moment, vertical 9:16, no text.`,
        action: "Open on the tension immediately.",
        audio: variant?.hook || "Voiceover states the hook.",
        onScreenText: "Short hook phrase",
        purpose: "Stop scroll"
      },
      {
        scene: "2",
        time: "3-7s",
        visual: `Introduce ${formValues.brand} through the ${formValues.contentFormat.toLowerCase()} format.`,
        image: `Reference image: ${formValues.brand} appears naturally in the scene, no text or logos.`,
        action: "Show the mechanism or contrast.",
        audio: "Explain the problem in plain language.",
        onScreenText: "Problem phrase",
        purpose: "Build interest"
      },
      {
        scene: "3",
        time: "7-13s",
        visual: `Show the main benefit: ${formValues.benefit}.`,
        image: `Reference image: clear visual evidence of ${formValues.benefit}, no text overlay.`,
        action: "Demonstrate the outcome.",
        audio: `Make the benefit concrete: ${formValues.benefit}.`,
        onScreenText: "Benefit phrase",
        purpose: "Build trust"
      },
      {
        scene: "4",
        time: "13-18s",
        visual: "End on the product, user, or final outcome.",
        image: `Reference image: final outcome shot for ${formValues.brand}, clean vertical composition.`,
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

function escapeAttribute(valueToEscape) {
  return escapeHtml(valueToEscape).replaceAll("\n", " ");
}
