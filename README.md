# Social Creative Lab

A classroom tool for helping students create platform-native social media content for Facebook, Instagram, and TikTok. The workflow starts with content setup, then moves through content inputs, hook selection, output controls, generation, revision, image planning, optional image generation, and downloads.

## What It Does

- Starts with content format and awareness-stage alignment.
- Uses dropdowns for all option lists, with an `Other` field for student-specific choices.
- Generates hooks before full captions so students choose an opening intentionally.
- Produces Facebook, Instagram, or TikTok-specific outputs.
- Lets students decide whether an engagement question should be included.
- Adds TikTok storyboard mode with scenes, timing, visuals, audio, and Canva/CapCut build notes.
- Keeps captions and images as separate assets.
- Generates clean, detailed image concepts and editable image prompts with no visible text embedded in the image.
- Lets students manually edit image prompts or ask AI to improve them before generating images.
- Allows manual editing or AI revision with a student-written revision instruction.
- Downloads captions, storyboard, images, and a full package zip.

## Deploy On Netlify

1. Create a new GitHub repo from this folder.
2. Connect the repo to Netlify.
3. In Netlify, add environment variables:

```txt
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-3-flash-preview
GEMINI_IMAGE_MODEL=gemini-2.5-flash-image
```

4. Use the included `netlify.toml`. There is no frontend build step.

## Local Development

If you have `npm` available:

```bash
npm install
npm run start
```

Without Netlify Functions running locally, the browser app still shows mock outputs so the interface can be reviewed.

## Gemini SDK Note

The Netlify Functions use the current JavaScript SDK pattern:

```js
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

Gemini calls are server-side only. Do not put the API key in browser JavaScript.
