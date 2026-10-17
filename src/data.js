// The Realtime Database is used as the app's shared data store.
const DATABASE = "https://ucord-5cc47-default-rtdb.firebaseio.com";
const LOCAL_PREFIX = "ucord:cache:";
const PRIVATE_ROOTS = new Set(["accounts", "profiles", "directory", "memberships", "servers", "serverMembers", "messages", "dms", "dmIndex", "invites", "voiceRooms"]);

function canCache(path) {
  return !PRIVATE_ROOTS.has(path.split("/")[0]);
}

function cacheKey(path) {
  return LOCAL_PREFIX + path;
}

function readCache(path) {
  if (!canCache(path)) return null;
  try {
    const exact = JSON.parse(localStorage.getItem(cacheKey(path)) || "null");
    if (exact !== null) return exact;
    const prefix = `${cacheKey(path)}/`;
    const aggregate = {};
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (!key?.startsWith(prefix)) continue;
      const parts = key.slice(prefix.length).split("/");
      let node = aggregate;
      for (const part of parts.slice(0, -1)) {
        if (["__proto__", "constructor", "prototype"].includes(part)) { node = null; break; }
        if (!node[part] || typeof node[part] !== "object") node[part] = Object.create(null);
        node = node[part];
      }
      const leaf = parts.at(-1);
      if (node && !["__proto__", "constructor", "prototype"].includes(leaf)) node[leaf] = JSON.parse(localStorage.getItem(key) || "null");
    }
    return Object.keys(aggregate).length ? aggregate : null;
  } catch { return null; }
}

function removeCache(path) {
  try {
    const prefix = `${cacheKey(path)}/`;
    localStorage.removeItem(cacheKey(path));
    for (let index = localStorage.length - 1; index >= 0; index -= 1) {
      const key = localStorage.key(index);
      if (key?.startsWith(prefix)) localStorage.removeItem(key);
    }
  } catch { /* Cache cleanup is best effort. */ }
}

function writeCache(path, value) {
  if (!canCache(path)) return;
  try { localStorage.setItem(cacheKey(path), JSON.stringify(value)); }
  catch { /* The remote store remains available when browser storage is full. */ }
}

async function request(path, method = "GET", value) {
  if (typeof path !== "string" || path.length > 640) throw new TypeError("Invalid database path.");
  const segments = path.split("/");
  if (!segments.length || segments.length > 8 || segments.some((part) => !part || part.length > 128 || part === "." || part === ".." || /[.#$\[\]\u0000-\u001f\u007f]/.test(part) || ["__proto__", "constructor", "prototype"].includes(part))) {
    throw new TypeError("Invalid database path.");
  }
  const cleanPath = segments.join("/");
  const encodedPath = segments.map((part) => encodeURIComponent(part)).join("/");
  try {
    const body = method === "GET" || method === "DELETE" ? undefined : JSON.stringify(value);
    if (body && new TextEncoder().encode(body).byteLength > 12_000_000) throw new TypeError("This update is too large.");
    const response = await fetch(`${DATABASE}/${encodedPath}.json`, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body,
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
    });
    if (!response.ok) throw new Error(`Database request failed (${response.status})`);
    const responseText = response.status === 204 ? "null" : await response.text();
    if (responseText.length > 12_000_000) throw new TypeError("The server response is too large.");
    const result = JSON.parse(responseText);
    if (method === "GET") writeCache(cleanPath, result);
    else if (method === "DELETE") removeCache(cleanPath);
    else writeCache(cleanPath, value);
    return result;
  } catch (error) {
    if (method === "GET") return canCache(cleanPath) ? readCache(cleanPath) : null;
    if (method === "DELETE") {
      removeCache(cleanPath);
      return null;
    }
    if (!canCache(cleanPath)) throw error;
    writeCache(cleanPath, value);
    console.warn("ucord is using its local cache for this update.", error);
    return method === "POST" ? { name: newId("local-") } : value;
  }
}

export const db = {
  get: (path) => request(path),
  set: (path, value) => request(path, "PUT", value),
  patch: (path, value) => request(path, "PATCH", value),
  push: (path, value) => request(path, "POST", value),
  delete: (path) => request(path, "DELETE"),
};

export function newId(prefix = "") {
  const webCrypto = globalThis.crypto;
  if (typeof webCrypto?.randomUUID === "function") return `${prefix}${webCrypto.randomUUID().replaceAll("-", "")}`;
  const bytes = new Uint8Array(16);
  if (typeof webCrypto?.getRandomValues !== "function") throw new Error("Secure random number generation is required.");
  webCrypto.getRandomValues(bytes);
  return `${prefix}${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

export function usernameKey(username) {
  return username.trim().toLowerCase();
}

const SHA256_K = new Uint32Array([
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
]);

function rotateRight(value, amount) { return (value >>> amount) | (value << (32 - amount)); }

function sha256(input) {
  const length = input.length;
  const paddedLength = Math.ceil((length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLength);
  padded.set(input);
  padded[length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(paddedLength - 4, length * 8, false);
  const hash = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
  const words = new Uint32Array(64);
  for (let offset = 0; offset < paddedLength; offset += 64) {
    for (let index = 0; index < 16; index += 1) words[index] = view.getUint32(offset + index * 4, false);
    for (let index = 16; index < 64; index += 1) {
      const a = words[index - 15];
      const b = words[index - 2];
      const s0 = rotateRight(a, 7) ^ rotateRight(a, 18) ^ (a >>> 3);
      const s1 = rotateRight(b, 17) ^ rotateRight(b, 19) ^ (b >>> 10);
      words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
    }
    let a = hash[0], b = hash[1], c = hash[2], d = hash[3];
    let e = hash[4], f = hash[5], g = hash[6], h = hash[7];
    for (let index = 0; index < 64; index += 1) {
      const sum1 = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
      const choice = (e & f) ^ (~e & g);
      const temp1 = (h + sum1 + choice + SHA256_K[index] + words[index]) >>> 0;
      const sum0 = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
      const majority = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (sum0 + majority) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }
    hash[0] = (hash[0] + a) >>> 0; hash[1] = (hash[1] + b) >>> 0;
    hash[2] = (hash[2] + c) >>> 0; hash[3] = (hash[3] + d) >>> 0;
    hash[4] = (hash[4] + e) >>> 0; hash[5] = (hash[5] + f) >>> 0;
    hash[6] = (hash[6] + g) >>> 0; hash[7] = (hash[7] + h) >>> 0;
  }
  const result = new Uint8Array(32);
  const output = new DataView(result.buffer);
  hash.forEach((word, index) => output.setUint32(index * 4, word, false));
  return result;
}

function concatBytes(...arrays) {
  const result = new Uint8Array(arrays.reduce((total, array) => total + array.length, 0));
  let offset = 0;
  for (const array of arrays) { result.set(array, offset); offset += array.length; }
  return result;
}

async function pbkdf2Fallback(password, salt, iterations) {
  const key = new TextEncoder().encode(password);
  const blockKey = key.length > 64 ? sha256(key) : key;
  const innerPad = new Uint8Array(64).fill(0x36);
  const outerPad = new Uint8Array(64).fill(0x5c);
  for (let index = 0; index < blockKey.length; index += 1) {
    innerPad[index] ^= blockKey[index];
    outerPad[index] ^= blockKey[index];
  }
  const hmac = (message) => sha256(concatBytes(outerPad, sha256(concatBytes(innerPad, message))));
  let current = hmac(concatBytes(salt, new Uint8Array([0, 0, 0, 1])));
  const output = new Uint8Array(current);
  for (let round = 1; round < iterations; round += 1) {
    current = hmac(current);
    for (let index = 0; index < output.length; index += 1) output[index] ^= current[index];
    if (round % 800 === 0) await new Promise((resolve) => setTimeout(resolve, 0));
  }
  return output;
}

export async function derivePassword(password, saltHex, requestedIterations) {
  const webCrypto = globalThis.crypto;
  const subtleAvailable = typeof webCrypto?.subtle?.importKey === "function" && typeof webCrypto?.subtle?.deriveBits === "function";
  if (typeof password !== "string" || password.length > 256) throw new TypeError("Password is too long.");
  const requested = Number(requestedIterations);
  const iterations = Number.isSafeInteger(requested) && requested > 0
    ? Math.max(1_000, Math.min(requested, 500_000))
    : (subtleAvailable ? 180_000 : 24_000);
  if (saltHex && !/^(?:[\da-f]{2}){16}$/i.test(saltHex)) throw new TypeError("Invalid password salt.");
  const salt = saltHex
    ? Uint8Array.from(saltHex.match(/.{2}/g).map((part) => parseInt(part, 16)))
    : (() => {
      const bytes = new Uint8Array(16);
      if (typeof webCrypto?.getRandomValues !== "function") throw new Error("Secure random number generation is required.");
      webCrypto.getRandomValues(bytes);
      return bytes;
    })();
  let bits;
  if (subtleAvailable) {
    try {
      const key = await webCrypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
      bits = new Uint8Array(await webCrypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, 256));
    } catch { bits = await pbkdf2Fallback(password, salt, iterations); }
  } else {
    bits = await pbkdf2Fallback(password, salt, iterations);
  }
  return {
    salt: Array.from(salt, (byte) => byte.toString(16).padStart(2, "0")).join(""),
    verifier: Array.from(bits, (byte) => byte.toString(16).padStart(2, "0")).join(""),
    iterations,
  };
}
