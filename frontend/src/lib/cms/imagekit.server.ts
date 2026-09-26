/**
 * Phase 11 — ImageKit media provider (SERVER-ONLY, first MediaProvider).
 *
 * This module must NEVER be imported by browser/client code (server-only
 * marker, same as services/missions.server.ts). The ImageKit PRIVATE key is
 * read from the Worker env on the server and used exclusively in
 * server-to-ImageKit fetch calls — it never enters a bundle, a D1 row, a
 * URL, or a client-visible response.
 *
 * Secrets & configuration (Cloudflare env on the frontend Worker):
 *   IMAGEKIT_PRIVATE_KEY — SECRET (`wrangler secret put`), server use only.
 *   IMAGEKIT_PUBLIC_KEY  — needed only for future client-side upload widgets;
 *                          exposed to browsers ONLY via getPublicConfig().
 *   IMAGEKIT_URL_ENDPOINT — e.g. https://ik.imagekit.io/<accountId> (plain var).
 *
 * Scope discipline: this file wraps the MINIMUM ImageKit surface the CMS
 * needs (upload / delete / delivery URL / declarative variants). It is not a
 * general ImageKit SDK. No ImageKit type leaks past this module's boundary:
 * callers see only MediaProvider + MediaAsset.
 *
 * Future R2 provider: implement MediaProvider against R2/S3-compatible APIs
 * in a sibling file; the D1 model already keys on (provider, providerAssetId).
 */

import "@tanstack/react-start/server-only";

import type { CmsWorkerEnv } from "./db.server";
import {
  validateUploadInput,
  type MediaProvider,
  type MediaProviderId,
  type MediaUploadInput,
  type MediaUploadResult,
  type MediaVariantOptions,
} from "./media-provider";

export const IMAGEKIT_PROVIDER_ID = "imagekit" as const;

const IMAGEKIT_UPLOAD_URL = "https://upload.imagekit.io/api/v1/files/upload";
const IMAGEKIT_API_BASE = "https://api.imagekit.io/v1";

export interface ImageKitConfig {
  publicKey: string;
  privateKey: string;
  urlEndpoint: string;
}

/**
 * Read ImageKit config from the Worker env. Throws fail-closed when the
 * private key or endpoint is missing — uploads must never silently proceed
 * misconfigured (or worse, fall back to an insecure default).
 */
export function imageKitConfigFromEnv(env: CmsWorkerEnv): ImageKitConfig {
  const privateKey =
    typeof env.IMAGEKIT_PRIVATE_KEY === "string" && env.IMAGEKIT_PRIVATE_KEY !== ""
      ? env.IMAGEKIT_PRIVATE_KEY
      : null;
  const publicKey = typeof env.IMAGEKIT_PUBLIC_KEY === "string" ? env.IMAGEKIT_PUBLIC_KEY : "";
  let urlEndpoint =
    typeof env.IMAGEKIT_URL_ENDPOINT === "string" ? env.IMAGEKIT_URL_ENDPOINT.trim() : "";
  urlEndpoint = urlEndpoint.replace(/\/+$/, "");
  if (!privateKey) {
    throw new Error(
      "ImageKit is not configured: set the IMAGEKIT_PRIVATE_KEY secret. " +
        "Uploads are disabled until it is present.",
    );
  }
  if (!urlEndpoint || !urlEndpoint.startsWith("https://")) {
    throw new Error("ImageKit is not configured: IMAGEKIT_URL_ENDPOINT must be an https URL.");
  }
  return { publicKey, privateKey, urlEndpoint };
}

/** Only the fields that are safe to expose to browser code, ever. */
export function getImageKitPublicConfig(config: ImageKitConfig): {
  urlEndpoint: string;
  publicKey: string;
} {
  return { urlEndpoint: config.urlEndpoint, publicKey: config.publicKey };
}

/**
 * Folder hints are untrusted input: strip traversal, collapse separators,
 * cap length. The provider NEVER writes outside its own account root — the
 * worst a hostile folder can do is create an oddly-named sibling folder.
 */
export function sanitizeFolder(folder: unknown): string {
  if (typeof folder !== "string") return "hawkbucks-cms";
  const cleaned = folder
    .split("/")
    .map((part) => part.replace(/[^A-Za-z0-9_-]+/g, "").trim())
    .filter((part) => part !== "" && part !== "." && part !== "..")
    .join("/");
  return (cleaned === "" ? "hawkbucks-cms" : cleaned).slice(0, 120);
}

function basicAuthHeader(privateKey: string): string {
  return `Basic ${btoa(`${privateKey}:`)}`;
}

interface ImageKitUploadResponse {
  fileId?: string;
  url?: string;
  size?: number;
  width?: number;
  height?: number;
}

export function createImageKitProvider(
  config: ImageKitConfig,
  fetchImpl: typeof fetch = globalThis.fetch,
): MediaProvider {
  const endpoint = config.urlEndpoint.replace(/\/+$/, "");

  const toResult = (
    payload: ImageKitUploadResponse,
    input: MediaUploadInput,
  ): MediaUploadResult => {
    if (!payload.fileId || !payload.url) {
      throw new Error("ImageKit upload response missing fileId/url.");
    }
    const bytes = input.data instanceof Uint8Array ? input.data.byteLength : input.data.byteLength;
    return {
      providerAssetId: payload.fileId,
      deliveryUrl: payload.url,
      byteSize: typeof payload.size === "number" ? payload.size : bytes,
      mimeType: input.mimeType,
      width: typeof payload.width === "number" ? payload.width : null,
      height: typeof payload.height === "number" ? payload.height : null,
    };
  };

  return {
    id: IMAGEKIT_PROVIDER_ID as MediaProviderId,

    async upload(input: MediaUploadInput): Promise<MediaUploadResult> {
      const valid = validateUploadInput(input);
      if (!valid.ok) throw new Error(`Invalid upload: ${valid.reason}`);

      const bytes = input.data instanceof Uint8Array ? input.data : new Uint8Array(input.data);
      const form = new FormData();
      form.append(
        "file",
        new Blob([bytes as BlobPart], { type: input.mimeType }),
        input.originalFilename,
      );
      form.append("fileName", input.originalFilename);
      form.append("folder", sanitizeFolder(input.folder));

      const response = await fetchImpl(IMAGEKIT_UPLOAD_URL, {
        method: "POST",
        headers: { Authorization: basicAuthHeader(config.privateKey) },
        body: form,
      });
      if (!response.ok) {
        // Never include the key in error text; status + provider message only.
        const detail = await response.text().catch(() => "");
        throw new Error(
          `ImageKit upload failed with HTTP ${response.status}${detail ? `: ${detail.slice(0, 200)}` : ""}`,
        );
      }
      const payload = (await response.json()) as ImageKitUploadResponse;
      return toResult(payload, input);
    },

    async remove(providerAssetId: string): Promise<void> {
      if (!providerAssetId || providerAssetId.includes("..") || providerAssetId.includes("/")) {
        throw new Error("Invalid provider asset id.");
      }
      const response = await fetchImpl(
        `${IMAGEKIT_API_BASE}/files/${encodeURIComponent(providerAssetId)}`,
        {
          method: "DELETE",
          headers: { Authorization: basicAuthHeader(config.privateKey) },
        },
      );
      if (!response.ok && response.status !== 404) {
        throw new Error(`ImageKit delete failed with HTTP ${response.status}`);
      }
    },

    deliveryUrl(providerAssetId: string): string {
      if (providerAssetId.startsWith("https://")) return providerAssetId;
      return `${endpoint}/${providerAssetId.replace(/^\/+/, "")}`;
    },

    variantUrl(providerAssetId: string, variant: MediaVariantOptions): string {
      const base = this.deliveryUrl(providerAssetId);
      const transforms: string[] = [];
      if (variant.width !== undefined) transforms.push(`w-${Math.round(variant.width)}`);
      if (variant.height !== undefined) transforms.push(`h-${Math.round(variant.height)}`);
      if (variant.quality !== undefined) {
        transforms.push(`q-${Math.max(1, Math.min(100, Math.round(variant.quality)))}`);
      }
      if (transforms.length === 0) return base;
      const separator = base.includes("?") ? "&" : "?";
      return `${base}${separator}tr=${transforms.join(",")}`;
    },
  };
}
