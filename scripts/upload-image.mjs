import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API_URL = "https://image.dooo.ng/api/v2/upload";
const STORAGE_ID = "8";
const IS_PUBLIC = "1";

const IMAGE_MIME_TYPES = {
  ".apng": "image/apng",
  ".avif": "image/avif",
  ".bmp": "image/bmp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".heif": "image/heif",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".tif": "image/tiff",
  ".tiff": "image/tiff",
  ".webp": "image/webp"
};

function usage() {
  const scriptPath = fileURLToPath(import.meta.url);
  const relativePath = path.relative(process.cwd(), scriptPath) || scriptPath;
  console.error(`Usage: node ${relativePath} <image-path>`);
}

function detectMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();
  return IMAGE_MIME_TYPES[extension] ?? "application/octet-stream";
}

function collectStringValues(value, values = []) {
  if (typeof value === "string") {
    values.push(value);
    return values;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectStringValues(item, values);
    }
    return values;
  }

  if (value && typeof value === "object") {
    for (const nested of Object.values(value)) {
      collectStringValues(nested, values);
    }
  }

  return values;
}

function isLikelyPublicUrl(value) {
  if (!value.startsWith("http://") && !value.startsWith("https://")) {
    return false;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return false;
    }

    const pathname = parsed.pathname.toLowerCase();
    return /\.(apng|avif|bmp|gif|heic|heif|ico|jpeg|jpg|png|svg|tif|tiff|webp)(?:$|\?)/.test(pathname)
      || pathname.includes("/upload")
      || pathname.includes("/image")
      || pathname.includes("/img");
  } catch {
    return false;
  }
}

function extractPublicUrl(payload) {
  const preferredKeys = ["url", "src", "link", "href", "download_url", "public_url", "image_url"];

  if (payload && typeof payload === "object") {
    for (const key of preferredKeys) {
      if (typeof payload[key] === "string" && isLikelyPublicUrl(payload[key])) {
        return payload[key];
      }
    }
  }

  const urls = collectStringValues(payload).filter(isLikelyPublicUrl);
  return urls[0] ?? null;
}

async function main() {
  const [inputPath] = process.argv.slice(2);
  if (!inputPath) {
    usage();
    process.exit(1);
  }

  const absolutePath = path.resolve(process.cwd(), inputPath);
  try {
    await access(absolutePath);
  } catch {
    console.error(`File not found: ${absolutePath}`);
    process.exit(1);
  }

  const buffer = await readFile(absolutePath);
  const filename = path.basename(absolutePath);
  const mimeType = detectMimeType(absolutePath);

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType }), filename);
  form.append("storage_id", STORAGE_ID);
  form.append("is_public", IS_PUBLIC);

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Accept: "application/json"
    },
    body: form
  });

  const rawBody = await response.text();
  let payload;

  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error(`Upload failed with non-JSON response (HTTP ${response.status}).`);
    console.error(rawBody);
    process.exit(1);
  }

  if (!response.ok) {
    console.error(`Upload failed (HTTP ${response.status}).`);
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  const publicUrl = extractPublicUrl(payload);
  if (!publicUrl) {
    console.error("Upload succeeded but no public URL was found in the response payload.");
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  console.log(publicUrl);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
