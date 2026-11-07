'use client';

import { use } from 'react';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';

const requests = new Map<string, Promise<GLTF>>();

export function loadKeptGltf(url: string): Promise<GLTF> {
  const existing = requests.get(url);
  if (existing) return existing;
  const promise = new Promise<GLTF>((resolve, reject) => {
    const loader = new GLTFLoader();
    // Strip query so relative texture paths resolve next to the asset file.
    const clean = url.split('?')[0] ?? url;
    const slash = clean.lastIndexOf('/');
    if (slash >= 0) loader.setResourcePath(clean.slice(0, slash + 1));
    loader.load(url, resolve, undefined, reject);
  }).catch((error: unknown) => {
    requests.delete(url);
    throw error;
  });
  requests.set(url, promise);
  return promise;
}

export function useKeptGltf(url: string): GLTF {
  return use(loadKeptGltf(url));
}

/** Preload failures are retried by the mounted consumer and handled by its boundary. */
export function preloadKeptGltf(url: string): void {
  void loadKeptGltf(url).catch(() => undefined);
}
