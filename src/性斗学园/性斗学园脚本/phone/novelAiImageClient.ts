import { unzipSync } from 'fflate';
import { makeIndexedImageRef, saveIndexedImageBlob } from '../../shared/indexedImageStore';
import { makeId, safeString } from './text';
import {
  buildNovelAiPositivePrompt,
  getNovelAiImageSize,
  getNovelAiImageStatus,
  loadNovelAiImageSettings,
  NOVELAI_IMAGE_SCALE_MAX,
  type NovelAiImageSettings,
} from './novelAiImageSettings';

const NOVELAI_IMAGE_API_BASE = 'https://image.novelai.net';
const NOVELAI_GENERATE_IMAGE_ENDPOINT = `${NOVELAI_IMAGE_API_BASE}/ai/generate-image`;
const NOVELAI_TAG_SUGGEST_ENDPOINT = `${NOVELAI_IMAGE_API_BASE}/ai/generate-image/suggest-tags`;

export interface NovelAiGeneratedImage {
  ref: string;
  prompt: string;
  negativePrompt: string;
  width: number;
  height: number;
  mimeType: string;
}

export interface GenerateNovelAiImageOptions {
  applyPrefix?: boolean;
}

function buildHeaders(apiKey: string, options: { accept: 'json' | 'zip'; json?: boolean }): HeadersInit {
  const key = safeString(apiKey).replace(/^Bearer\s+/i, '');
  const headers: Record<string, string> = {
    Accept: options.accept === 'json' ? 'application/json' : 'application/zip',
  };
  if (key) headers.Authorization = `Bearer ${key}`;
  if (options.json) headers['Content-Type'] = 'application/json';
  return headers;
}

async function readErrorMessage(response: Response): Promise<string> {
  const text = await response.text().catch(() => '');
  if (!text) return `${response.status} ${response.statusText}`;
  try {
    const parsed = JSON.parse(text);
    return safeString(parsed?.error?.message || parsed?.message || parsed?.error || text);
  } catch {
    return text;
  }
}

function pickImageFromZip(buffer: ArrayBuffer): { bytes: Uint8Array; fileName: string; mimeType: string } {
  const files = unzipSync(new Uint8Array(buffer));
  for (const [fileName, bytes] of Object.entries(files)) {
    const normalizedName = fileName.toLowerCase();
    if (!bytes.length || normalizedName.endsWith('/')) continue;
    if (!/\.(png|webp)$/i.test(fileName)) continue;
    return {
      bytes,
      fileName,
      mimeType: normalizedName.endsWith('.webp') ? 'image/webp' : 'image/png',
    };
  }
  throw new Error('NovelAI 返回的 zip 中没有找到图片');
}

function isV4ImageModel(model: string): boolean {
  return /^nai-diffusion-4/i.test(safeString(model));
}

function buildV4Prompt(prompt: string, legacyUc = false) {
  return {
    caption: {
      base_caption: prompt,
      char_captions: [],
    },
    use_coords: false,
    use_order: !legacyUc,
    legacy_uc: legacyUc,
  };
}

function buildNovelAiGenerationBody(
  model: string,
  prompt: string,
  negativePrompt: string,
  options: {
    width: number;
    height: number;
    steps: number;
    scale: number;
    seed: number;
  },
): Record<string, unknown> {
  const parameters: Record<string, unknown> = {
    width: options.width,
    height: options.height,
    scale: options.scale,
    sampler: 'k_euler_ancestral',
    steps: options.steps,
    n_samples: 1,
    seed: options.seed,
    prompt,
    negative_prompt: negativePrompt,
    uc: negativePrompt,
    image_format: 'png',
    qualityToggle: true,
    params_version: isV4ImageModel(model) ? 3 : 1,
    dynamic_thresholding: false,
    sm: false,
    sm_dyn: false,
    noise_schedule: 'karras',
    legacy: false,
    legacy_v3_extend: false,
  };

  if (isV4ImageModel(model)) {
    parameters.v4_prompt = buildV4Prompt(prompt);
    parameters.v4_negative_prompt = buildV4Prompt(negativePrompt, false);
  }

  return {
    action: 'generate',
    input: prompt,
    model,
    parameters,
  };
}

export async function testNovelAiImageConnection(settingsOverride?: NovelAiImageSettings): Promise<string> {
  const settings = settingsOverride || loadNovelAiImageSettings();
  const status = getNovelAiImageStatus({ ...settings, enabled: true });
  if (!safeString(status.settings.apiKey)) throw new Error('请先填写 NovelAI API Key');
  if (!safeString(status.settings.model)) throw new Error('请先选择 NovelAI 模型');

  const url = new URL(NOVELAI_TAG_SUGGEST_ENDPOINT);
  url.searchParams.set('model', status.settings.model);
  url.searchParams.set('prompt', '1g');
  url.searchParams.set('lang', 'en');

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildHeaders(status.settings.apiKey, { accept: 'json' }),
  });
  if (!response.ok) {
    throw new Error(`NovelAI 连接失败：${await readErrorMessage(response)}`);
  }

  const payload = await response.json().catch(() => null);
  const suggestions = Array.isArray(payload?.tags) ? payload.tags : Array.isArray(payload?.suggestions) ? payload.suggestions : [];
  return `连接成功：${status.settings.model}${suggestions.length ? `，标签建议 ${suggestions.length} 条` : ''}`;
}

export async function generateNovelAiImage(
  rawPrompt: string,
  settingsOverride?: NovelAiImageSettings,
  options: GenerateNovelAiImageOptions = {},
): Promise<NovelAiGeneratedImage> {
  const settings = settingsOverride || loadNovelAiImageSettings();
  const status = getNovelAiImageStatus(settings);
  if (!status.ready) throw new Error(status.reason);

  const prompt = options.applyPrefix === false ? safeString(rawPrompt) : buildNovelAiPositivePrompt(rawPrompt, status.settings);
  if (!prompt) throw new Error('NovelAI 生图提示词为空');

  const size = getNovelAiImageSize(status.settings);
  const negativePrompt = safeString(status.settings.negativePrompt);
  const scale = Math.min(NOVELAI_IMAGE_SCALE_MAX, Math.max(1, Number(status.settings.scale) || 7));
  const seed = Math.floor(Math.random() * 4294967295);

  const response = await fetch(NOVELAI_GENERATE_IMAGE_ENDPOINT, {
    method: 'POST',
    headers: buildHeaders(status.settings.apiKey, { accept: 'zip', json: true }),
    body: JSON.stringify(
      buildNovelAiGenerationBody(status.settings.model, prompt, negativePrompt, {
        width: size.width,
        height: size.height,
        scale,
        steps: status.settings.steps,
        seed,
      }),
    ),
  });

  if (!response.ok) {
    throw new Error(`NovelAI 生图失败：${await readErrorMessage(response)}`);
  }

  const image = pickImageFromZip(await response.arrayBuffer());
  const ref = makeIndexedImageRef(`backstreet-novelai:${makeId('img')}:${image.fileName}`);
  await saveIndexedImageBlob(ref, new Blob([image.bytes], { type: image.mimeType }));

  return {
    ref,
    prompt,
    negativePrompt,
    width: size.width,
    height: size.height,
    mimeType: image.mimeType,
  };
}
