import { db, derivePassword, newId, usernameKey } from "./data.js";

const app = document.querySelector("#app");
const EMOJIS = ["✨", "💜", "🫶", "🔥", "🎮", "🌿", "💡", "🌙", "☀️", "🚀", "🎨", "🐸", "🧃", "💬", "🎧", "🌈"];
const ACCENTS = ["#ef233c", "#c1121f", "#ff4d5a", "#8f0d1a", "#d72638", "#ff6673"];
const ROLE_PERMISSIONS = ["manageChannels", "manageEmojis", "manageRoles"];
const state = {
  route: "landing", authMode: "login", user: null, servers: [], activeServer: null,
  serverMembers: [],
  activeChannel: null, area: "home", modal: null, messages: [], currentDM: null,
  composerDrafts: {},
  dmMessages: [], discoverSearch: "", filter: "All", voiceJoined: false,
  pendingInvite: new URLSearchParams(location.search).get("invite") || "", homeSearch: "",
  voiceConnecting: false, voiceMuted: false, voiceStream: null, voicePeers: {},
  voiceMembers: [], voiceRoom: null, voicePoll: null, voiceSeenOffers: {}, sidebarOpen: false, guestPrompt: false,
  voiceSeenCandidates: {}, voicePendingCandidates: {}, voiceLastPresence: 0,
};
let messagePoll;

const icons = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  chat: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8A8.5 8.5 0 0 1 8.7 4a8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
  compass: '<circle cx="12" cy="12" r="10"/><path d="m16.2 7.8-2.1 6.3-6.3 2.1 2.1-6.3z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.8 1l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.8-1l-1.7.7-1.4-2.4 1.4-1.1a8 8 0 0 1 0-2l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.8-1l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.8 1l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1 0 2z" transform="translate(-1 -1)"/>',
  hash: '<path d="M4 9h16M4 15h16M10 3 8 21m8-18-2 18"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2m-7 9v3m-4 0h8"/>',
  users: '<path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2m6-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm10 10v-2a4 4 0 0 0-3-3.9m-1-12a4 4 0 0 1 0 7.8"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7ZM22 2 11 13"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  close: '<path d="m18 6-12 12M6 6l12 12"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20z"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 13h4"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  spark: '<path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3zm7 13 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
  more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
};
const icon = (name, size = 18) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name] || icons.spark}</svg>`;
const esc = (value = "") => (typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? String(value) : "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
const cleanText = (value, max = 2000) => (typeof value === "string" || typeof value === "number" ? String(value) : "").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0, max);
const safeNumber = (value, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.length <= 24 && /^-?\d+(?:\.\d+)?$/.test(value)) return Number(value);
  return fallback;
};
const safeAccent = (value) => ACCENTS.includes(value) ? value : ACCENTS[0];
const accentClass = (value) => `accent-${Math.max(0, ACCENTS.indexOf(safeAccent(value)))}`;
const safeImageSrc = (value) => typeof value === "string" && value.length <= 360_000 && /^data:image\/(?:png|jpeg|gif|webp);base64,[a-z\d+/]+={0,2}$/i.test(value) ? value : "";
const safeKey = (value) => typeof value === "string" && value.length <= 128 && /^[a-z\d_-]+$/i.test(value) && !["__proto__", "constructor", "prototype"].includes(value) ? value : "";
const safeTags = (value) => [...new Set((Array.isArray(value) ? value.filter((tag) => typeof tag === "string").join(",") : cleanText(value, 500)).split(",").map((tag) => cleanText(tag, 40).replace(/^#/, "").toLowerCase()).filter((tag) => /^[a-z\d_-]{1,20}$/.test(tag)))].slice(0, 5);
const safeUsername = (value) => typeof value === "string" && /^[a-z\d_]{3,20}$/i.test(value.trim());
const safeVisibility = (value) => value === "public" ? "public" : value === "private" ? "private" : "";
function hasServerPermission(server, userId, permission) {
  if (!server || !safeKey(userId)) return false;
  if (server.ownerId === userId) return true;
  if (!ROLE_PERMISSIONS.includes(permission)) return false;
  const assigned = Array.isArray(server.memberRoles?.[userId]) ? server.memberRoles[userId] : [];
  return assigned.some((roleId) => server.roles?.some((role) => role.id === roleId && role.permissions?.[permission] === true));
}
const initials = (name = "u") => esc(cleanText(name, 80).slice(0, 1).toUpperCase() || "U");
const avatar = (profile, extra = "") => {
  const source = safeImageSrc(profile?.avatar);
  const colorClass = accentClass(profile?.accent);
  return source
    ? `<span class="avatar ${extra} ${colorClass}"><img src="${source}" alt="" /></span>`
    : `<span class="avatar ${extra} ${colorClass}">${initials(profile?.displayName || profile?.username || "u")}</span>`;
};

function normalizeProfile(value, fallbackId = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = safeKey(value.id || fallbackId);
  const username = cleanText(value.username, 32);
  const guest = value.guest === true;
  if (!id || !username || (!guest && !/^[a-z\d_]{3,20}$/i.test(username))) return null;
  return {
    id, username, displayName: cleanText(value.displayName || username, 32) || username,
    bio: cleanText(value.bio, 180), avatar: safeImageSrc(value.avatar), accent: safeAccent(value.accent),
    theme: ["midnight", "dusk", "moss"].includes(value.theme) ? value.theme : "midnight",
    compact: value.compact === true, joinedAt: safeNumber(value.joinedAt, Date.now()),
    tags: safeTags(value.tags), guest,
  };
}

function normalizeServer(value, fallbackId = "") {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const id = safeKey(value.id || fallbackId);
  const name = cleanText(value.name, 48);
  if (!id || !name) return null;
  const channelCounts = { text: 0, voice: 0 };
  const channels = (Array.isArray(value.channels) ? value.channels : []).slice(0, 100).flatMap((channel) => {
    if (!channel || typeof channel !== "object" || !["text", "voice"].includes(channel.type)) return [];
    if (channelCounts[channel.type] >= (channel.type === "text" ? 20 : 10) || channelCounts.text + channelCounts.voice >= 30) return [];
    const channelId = safeKey(channel.id);
    const channelName = cleanText(channel.name, 32).toLowerCase();
    if (!channelId || !/^[a-z0-9_-]{1,32}$/.test(channelName)) return [];
    channelCounts[channel.type] += 1;
    return [{ id: channelId, name: channelName, type: channel.type, createdAt: safeNumber(channel.createdAt, Date.now()) || Date.now() }];
  });
  const emojis = (Array.isArray(value.emojis) ? value.emojis : []).slice(0, 50).flatMap((emoji) => {
    if (!emoji || typeof emoji !== "object" || typeof emoji.name !== "string" || !/^[a-z0-9_]{2,24}$/.test(emoji.name) || !safeImageSrc(emoji.src)) return [];
    return [{ name: emoji.name, src: safeImageSrc(emoji.src), addedBy: safeKey(emoji.addedBy), createdAt: safeNumber(emoji.createdAt, Date.now()) || Date.now() }];
  });
  const roleIds = new Set();
  const roles = (Array.isArray(value.roles) ? value.roles : []).slice(0, 20).flatMap((role) => {
    if (!role || typeof role !== "object" || Array.isArray(role)) return [];
    const roleId = safeKey(role.id);
    const roleName = cleanText(role.name, 32);
    if (!roleId || !roleName || roleIds.has(roleId)) return [];
    roleIds.add(roleId);
    const permissions = Object.fromEntries(ROLE_PERMISSIONS.map((permission) => [permission, role.permissions?.[permission] === true]));
    return [{ id: roleId, name: roleName, color: safeAccent(role.color), permissions }];
  });
  const memberRoles = {};
  const sourceMemberRoles = value.memberRoles && typeof value.memberRoles === "object" && !Array.isArray(value.memberRoles) ? value.memberRoles : {};
  for (const [memberId, assigned] of Object.entries(sourceMemberRoles).slice(0, 1000)) {
    const key = safeKey(memberId);
    if (!key || !Array.isArray(assigned)) continue;
    memberRoles[key] = [...new Set(assigned.filter((roleId) => safeKey(roleId) && roleIds.has(roleId)))].slice(0, 20);
  }
  const inviteCode = cleanText(value.inviteCode, 40).toLowerCase();
  return {
    id, name, description: cleanText(value.description, 180), visibility: value.visibility === "public" ? "public" : "private",
    ownerId: safeKey(value.ownerId), ownerName: cleanText(value.ownerName, 32), icon: safeImageSrc(value.icon),
    accent: safeAccent(value.accent), createdAt: safeNumber(value.createdAt, Date.now()) || Date.now(),
    memberCount: Math.max(1, Math.min(1_000_000_000, Math.floor(safeNumber(value.memberCount, 1) || 1))),
    inviteCode: /^join[a-f0-9]{14}$/.test(inviteCode) || /^join[a-f0-9]{32}$/.test(inviteCode) ? inviteCode : "",
    tags: safeTags(value.tags), emojis, channels, roles, memberRoles,
  };
}

function safeMessageList(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).slice(-250).filter(([, message]) => message && typeof message === "object" && !Array.isArray(message))
    .map(([key, message]) => ({
      id: safeKey(message.id) || safeKey(key) || newId("msg-"), authorId: safeKey(message.authorId), author: cleanText(message.author || "member", 32),
      avatar: safeImageSrc(message.avatar), body: cleanText(message.body, 1800),
      at: Math.max(1, Math.min(Date.now() + 86_400_000, safeNumber(message.at, Date.now()) || Date.now())),
    })).sort((a, b) => a.at - b.at);
}

function toast(message, kind = "") {
  const region = document.querySelector("#toast-region");
  const node = document.createElement("div");
  node.className = `toast ${kind}`;
  node.textContent = message;
  region.append(node);
  setTimeout(() => node.remove(), 3300);
}

function profileDefaults(username, id = usernameKey(username), guest = false) {
  return {
    id, username, displayName: username, bio: "", avatar: "", accent: ACCENTS[Math.floor(Math.random() * ACCENTS.length)],
    theme: "midnight", compact: false, joinedAt: Date.now(), tags: [], guest,
  };
}

function saveSession() {
  try {
    if (state.user) sessionStorage.setItem("ucord:session", JSON.stringify(state.user));
    else sessionStorage.removeItem("ucord:session");
  } catch { /* The app can still run when session storage is unavailable. */ }
}

function setRoute(route) {
  state.route = route;
  state.modal = null;
  render();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function enterApp(profile) {
  const normalized = normalizeProfile(profile);
  if (!normalized) { state.user = null; state.route = "landing"; render(); toast("That account profile is invalid. Please sign in again.", "error"); return; }
  state.user = normalized;
  state.route = "app";
  state.area = "home";
  state.activeServer = null;
  state.activeChannel = null;
  state.currentDM = null;
  saveSession();
  await loadServers();
  if (state.pendingInvite) {
    const invite = state.pendingInvite;
    state.pendingInvite = "";
    await joinInvite(invite);
    if (!state.activeServer) render();
    return;
  }
  render();
}

async function loadServers() {
  if (!state.user) return;
  const membershipData = await db.get(`memberships/${state.user.id}`);
  const membership = membershipData && typeof membershipData === "object" && !Array.isArray(membershipData) ? membershipData : {};
  const ids = Object.keys(membership).filter((id) => safeKey(id) && membership[id] === true).slice(0, 100);
  const records = await Promise.all(ids.map((id) => db.get(`servers/${id}`)));
  state.servers = records.map((record, index) => normalizeServer(record, ids[index])).filter(Boolean);
  if (state.activeServer && !state.servers.some((s) => s.id === state.activeServer.id)) {
    state.activeServer = null;
    state.activeChannel = null;
  }
}

function resetPoll() {
  clearInterval(messagePoll);
  messagePoll = null;
  if (state.route !== "app") return;
  if (state.activeServer && state.activeChannel && state.activeChannel.type === "text") {
    const serverId = state.activeServer.id;
    const channelId = state.activeChannel.id;
    messagePoll = setInterval(async () => {
      if (state.activeServer?.id !== serverId || state.activeChannel?.id !== channelId) return;
      const next = await db.get(`messages/${serverId}/${channelId}`);
      const list = safeMessageList(next);
      if (JSON.stringify(list) !== JSON.stringify(state.messages)) {
        state.messages = list;
        const box = document.querySelector("#message-list");
        if (box) {
          const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
          box.innerHTML = renderMessages(list, state.activeServer);
          if (nearBottom) box.scrollTop = box.scrollHeight;
        }
      }
    }, 4500);
  } else if (state.currentDM) {
    const key = dmKey(state.user.id, state.currentDM.id);
    messagePoll = setInterval(async () => {
      const next = await db.get(`dms/${key}`);
      const list = safeMessageList(next);
      if (JSON.stringify(list) !== JSON.stringify(state.dmMessages)) {
        state.dmMessages = list;
        const box = document.querySelector("#message-list");
        if (box) {
          const nearBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 120;
          box.innerHTML = renderMessages(list, null);
          if (nearBottom) box.scrollTop = box.scrollHeight;
        }
      }
    }, 4500);
  }
}

function dmKey(a, b) { return [a, b].sort().join("_"); }

function safeSessionDescription(value, type) {
  if (!value || typeof value !== "object" || Array.isArray(value) || value.type !== type || typeof value.sdp !== "string" || value.sdp.length > 65_536 || !/^[\x09\x0a\x0d\x20-\x7e]+$/.test(value.sdp)) return null;
  return { type, sdp: value.sdp };
}

function safeIceCandidate(value) {
  if (!value || typeof value !== "object" || Array.isArray(value) || typeof value.candidate !== "string" || value.candidate.length > 2048) return null;
  return {
    candidate: value.candidate,
    sdpMid: typeof value.sdpMid === "string" ? value.sdpMid.slice(0, 32) : null,
    sdpMLineIndex: Number.isInteger(value.sdpMLineIndex) && value.sdpMLineIndex >= 0 && value.sdpMLineIndex <= 255 ? value.sdpMLineIndex : null,
    usernameFragment: typeof value.usernameFragment === "string" ? value.usernameFragment.slice(0, 256) : null,
  };
}

function safeVoiceMembers(value, now = Date.now()) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.values(value).slice(0, 50).flatMap((member) => {
    if (!member || typeof member !== "object" || Array.isArray(member)) return [];
    const id = safeKey(member.id);
    const lastSeen = safeNumber(member.lastSeen, 0);
    if (!id || !lastSeen || (id !== state.user?.id && now - lastSeen >= 23_000)) return [];
    return [{ id, name: cleanText(member.name, 32) || "member", avatar: safeImageSrc(member.avatar), lastSeen }];
  });
}

function voiceBase() {
  return state.voiceRoom && `voiceRooms/${state.voiceRoom.serverId}/${state.voiceRoom.channelId}`;
}

function voiceMemberMarkup(members) {
  const everyone = members?.length ? members : [{ ...state.user, name: state.user?.displayName || state.user?.username }];
  return everyone.slice(0, 50).map((member) => {
    const source = safeImageSrc(member?.avatar);
    return `<div class="voice-person"><span class="avatar ${member.id === state.user?.id ? "avatar-lg" : ""}">${source ? `<img src="${source}" alt="" />` : initials(member.name || "u")}</span><div><b>${esc(cleanText(member.name || "member", 32))}${member.id === state.user?.id ? " <small>(you)</small>" : ""}</b><small>${member.id === state.user?.id && state.voiceMuted ? "Microphone muted" : "Connected to voice"}</small></div><span class="voice-person-status">${member.id === state.user?.id && state.voiceMuted ? "–" : "●"}</span></div>`;
  }).join("");
}

function makeVoicePeer(peerId) {
  if (state.voicePeers[peerId]) return state.voicePeers[peerId];
  const room = voiceBase();
  const peer = new RTCPeerConnection({ iceServers: [{ urls: "stun:stun.l.google.com:19302" }] });
  state.voicePeers[peerId] = peer;
  for (const track of state.voiceStream?.getTracks() || []) peer.addTrack(track, state.voiceStream);
  peer.onicecandidate = (event) => {
    if (!event.candidate || !room) return;
    const candidateId = newId("ice-");
    db.set(`${room}/signals/${peerId}/${state.user.id}/candidates/${state.user.id}/${candidateId}`, event.candidate.toJSON());
  };
  peer.ontrack = (event) => {
    const host = document.querySelector("#voice-audios");
    if (!host) return;
    let audio = [...host.querySelectorAll("audio")].find((node) => node.dataset.peer === peerId);
    if (!audio) {
      audio = document.createElement("audio");
      audio.dataset.peer = peerId;
      audio.autoplay = true;
      audio.playsInline = true;
      host.append(audio);
    }
    audio.srcObject = event.streams[0] || new MediaStream([event.track]);
    audio.play().catch(() => {});
  };
  return peer;
}

async function flushVoiceCandidates(peerId, peer) {
  const queued = state.voicePendingCandidates[peerId] || [];
  state.voicePendingCandidates[peerId] = [];
  for (const candidate of queued) {
    try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* A stale ICE candidate can be ignored. */ }
  }
}

async function offerVoicePeer(member) {
  const peerId = member.id;
  await db.delete(`${voiceBase()}/signals/${peerId}/${state.user.id}`);
  await db.delete(`${voiceBase()}/signals/${state.user.id}/${peerId}`);
  state.voiceSeenOffers[peerId] = "";
  const peer = makeVoicePeer(peerId);
  const offer = await peer.createOffer();
  await peer.setLocalDescription(offer);
  await db.set(`${voiceBase()}/signals/${peerId}/${state.user.id}/offer`, { type: offer.type, sdp: offer.sdp });
}

async function acceptVoiceOffer(peerId, offer) {
  const peer = makeVoicePeer(peerId);
  if (peer.remoteDescription?.sdp === offer.sdp) return;
  if (peer.signalingState !== "stable" && peer.signalingState !== "have-local-offer") return;
  try {
    await peer.setRemoteDescription(new RTCSessionDescription(offer));
    await flushVoiceCandidates(peerId, peer);
    const answer = await peer.createAnswer();
    await peer.setLocalDescription(answer);
    await db.set(`${voiceBase()}/signals/${peerId}/${state.user.id}/answer`, { type: answer.type, sdp: answer.sdp });
    state.voiceSeenOffers[peerId] = offer.sdp;
  } catch (error) {
    console.warn("Could not connect this voice peer.", error);
  }
}

async function receiveVoiceCandidates(peerId, peer) {
  peerId = safeKey(peerId);
  if (!peerId || peerId === state.user.id) return;
  const candidates = await db.get(`${voiceBase()}/signals/${state.user.id}/${peerId}/candidates/${peerId}`) || {};
  for (const [id, value] of Object.entries(candidates).slice(0, 50)) {
    const candidate = safeIceCandidate(value);
    if (!candidate) continue;
    const key = `${peerId}:${id}`;
    if (state.voiceSeenCandidates[key]) continue;
    state.voiceSeenCandidates[key] = true;
    if (!peer.remoteDescription) {
      (state.voicePendingCandidates[peerId] ||= []).push(candidate);
      continue;
    }
    try { await peer.addIceCandidate(new RTCIceCandidate(candidate)); } catch { /* Ignore candidates from an ended call. */ }
  }
}

async function pollVoiceRoom() {
  if (!state.voiceJoined || !state.voiceRoom) return;
  try {
    const memberData = await db.get(`${voiceBase()}/members`) || {};
    const now = Date.now();
    if (now - state.voiceLastPresence > 7000) {
      const self = { id: state.user.id, name: state.user.displayName || state.user.username, avatar: state.user.avatar || "", lastSeen: now };
      await db.set(`${voiceBase()}/members/${state.user.id}`, self);
      state.voiceLastPresence = now;
      if (memberData && typeof memberData === "object" && !Array.isArray(memberData)) memberData[state.user.id] = self;
    }
    const live = safeVoiceMembers(memberData, now);
    const connectedIds = new Set(live.map((member) => member.id));
    for (const peerId of Object.keys(state.voicePeers)) {
      if (!connectedIds.has(peerId)) {
        state.voicePeers[peerId].close();
        delete state.voicePeers[peerId];
        document.querySelector(`[data-peer="${CSS.escape(peerId)}"]`)?.remove();
      }
    }
    if (JSON.stringify(live) !== JSON.stringify(state.voiceMembers)) {
      state.voiceMembers = live;
      const host = document.querySelector("#voice-members");
      if (host) host.innerHTML = voiceMemberMarkup(live);
    }
    const inboxData = await db.get(`${voiceBase()}/signals/${state.user.id}`) || {};
    const inbox = inboxData && typeof inboxData === "object" && !Array.isArray(inboxData) ? inboxData : {};
    for (const [rawPeerId, signal] of Object.entries(inbox).slice(0, 50)) {
      const peerId = safeKey(rawPeerId);
      if (!peerId || peerId === state.user.id || !signal || typeof signal !== "object" || Array.isArray(signal)) continue;
      if (!state.voicePeers[peerId]) state.voicePeers[peerId] = makeVoicePeer(peerId);
      const peer = state.voicePeers[peerId];
      const offer = safeSessionDescription(signal.offer, "offer");
      const answer = safeSessionDescription(signal.answer, "answer");
      if (offer && state.voiceSeenOffers[peerId] !== offer.sdp) await acceptVoiceOffer(peerId, offer);
      if (answer && !peer.remoteDescription && peer.signalingState === "have-local-offer") {
        try {
          await peer.setRemoteDescription(new RTCSessionDescription(answer));
          await flushVoiceCandidates(peerId, peer);
        } catch (error) { console.warn("Could not finish this voice connection.", error); }
      }
      await receiveVoiceCandidates(peerId, peer);
    }
  } catch (error) {
    console.warn("Voice room sync paused.", error);
  }
}

async function joinVoiceRoom() {
  if (state.voiceConnecting || state.voiceJoined || !state.activeServer || !state.activeChannel) return;
  if (!navigator.mediaDevices?.getUserMedia || typeof RTCPeerConnection === "undefined") {
    toast("Voice chat needs a browser with microphone and WebRTC support.", "error");
    return;
  }
  state.voiceConnecting = true;
  render();
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    state.voiceStream = stream;
    state.voiceRoom = { serverId: state.activeServer.id, channelId: state.activeChannel.id };
    state.voiceMembers = [];
    state.voicePeers = {};
    state.voiceSeenOffers = {};
    state.voiceSeenCandidates = {};
    state.voicePendingCandidates = {};
    const present = await db.get(`${voiceBase()}/members`) || {};
    const now = Date.now();
    const others = safeVoiceMembers(present, now).filter((member) => member.id !== state.user.id);
    const self = { id: state.user.id, name: state.user.displayName || state.user.username, avatar: state.user.avatar || "", lastSeen: now };
    await db.set(`${voiceBase()}/members/${state.user.id}`, self);
    state.voiceLastPresence = now;
    state.voiceMembers = [...others, self];
    state.voiceJoined = true;
    state.voiceMuted = false;
    await Promise.all(others.map((member) => offerVoicePeer(member)));
    clearInterval(state.voicePoll);
    state.voicePoll = setInterval(pollVoiceRoom, 2500);
    state.voiceConnecting = false;
    render();
    toast(`You're connected to ${state.activeChannel.name}.`);
  } catch (error) {
    for (const track of state.voiceStream?.getTracks() || []) track.stop();
    state.voiceStream = null;
    state.voiceRoom = null;
    state.voiceConnecting = false;
    render();
    toast(error?.name === "NotAllowedError" ? "Allow microphone access to join voice." : "Couldn't start voice chat. Check your microphone and try again.", "error");
    return;
  }
}

async function leaveVoiceRoom() {
  if (!state.voiceRoom) { state.voiceJoined = false; return; }
  const base = voiceBase();
  const peerIds = Object.keys(state.voicePeers);
  clearInterval(state.voicePoll);
  state.voicePoll = null;
  state.voiceJoined = false;
  for (const peer of Object.values(state.voicePeers)) peer.close();
  state.voicePeers = {};
  for (const track of state.voiceStream?.getTracks() || []) track.stop();
  state.voiceStream = null;
  document.querySelectorAll("#voice-audios audio").forEach((audio) => audio.remove());
  await db.delete(`${base}/members/${state.user.id}`);
  await Promise.all(peerIds.map((peerId) => Promise.all([
    db.delete(`${base}/signals/${peerId}/${state.user.id}`),
    db.delete(`${base}/signals/${state.user.id}/${peerId}`),
  ])));
  state.voiceRoom = null;
  state.voiceMembers = [];
  state.voiceMuted = false;
}

function landingView() {
  return `<div class="landing">
    <header class="landing-nav wrap">
      <a class="brand" href="#top" data-action="top"><span class="brand-mark">u</span><span>ucord</span></a>
      <nav class="landing-links"><a href="#spaces">Your spaces</a><a href="#why-ucord">Why ucord</a><button class="nav-login" data-action="auth-login">Log in</button><button class="nav-join" data-action="auth-register">Get started ${icon("arrow", 15)}</button></nav>
    </header>
    <main id="top">
      <section class="hero wrap">
        <div class="hero-copy">
          <span class="eyebrow"><i class="eyebrow-dot"></i> ALL YOUR PEOPLE, IN ONE PLACE</span>
          <h1>GROUP CHAT<br />THAT’S ALL<br /><span>FUN &amp; GAMES</span></h1>
          <p>Talk, share, and build a community around the things you love. Customize your own space and make it feel like yours.</p>
          <div class="hero-bottom-actions">${state.guestPrompt
            ? `<div class="guest-entry-wrap"><form id="guest-form" class="guest-entry-form"><input name="username" aria-label="Display name" placeholder="Enter a display name" maxlength="24" autocomplete="nickname" required autofocus /><button type="submit" aria-label="Enter ucord">${icon("arrow", 18)}</button></form><p class="guest-entry-note" id="guest-error">Temporary guest · no password needed</p><button class="guest-cancel" type="button" data-action="guest-cancel">Back to choices</button></div>`
            : `<button class="button button-light button-large" data-action="guest-start">Try ucord as a guest ${icon("arrow", 17)}</button><button class="button button-browser button-large" data-action="auth-register">Open ucord in your browser</button>`}</div>
        </div>
        <div class="hero-art" aria-hidden="true">
          <div class="art-grid"></div><div class="orbit orbit-one"></div><div class="orbit orbit-two"></div>
          <div class="brand-emblem"><span>u</span><i></i></div>
          <span class="art-orb orb-one"></span><span class="art-orb orb-two"></span><span class="art-orb orb-three"></span>
          <span class="art-caption caption-one">YOUR SPACE</span><span class="art-caption caption-two">ALL INCLUDED</span>
        </div>
      </section>
      <section class="landing-proof wrap"><div class="proof-line"></div><span>Built for the group chat that became a community</span><div class="proof-line"></div></section>
      <section class="feature-section wrap" id="spaces"><div class="section-intro"><span class="eyebrow">MAKE YOURSELF AT HOME</span><h2>Everything you need.<br /><span>Nothing held back.</span></h2><p>From a quiet group chat to a thriving public community, you have all the tools from the start.</p></div>
        <div class="feature-grid"><article class="feature-card card-chat"><div class="feature-icon icon-purple">${icon("chat", 21)}</div><span class="feature-kicker">STAY CLOSE</span><h3>Conversation, your way</h3><p>Text channels, voice rooms, and direct messages make it easy to catch up or settle in for a while.</p><div class="feature-deco chat-lines"><i></i><i></i><i></i></div></article><article class="feature-card card-community"><div class="feature-icon icon-mint">${icon("users", 21)}</div><span class="feature-kicker">GROW TOGETHER</span><h3>A space that feels like yours</h3><p>Set your community public or private, invite your people, and add the tags that help new folks find you.</p><div class="community-bubbles"><i>✦</i><i>◈</i><i>☻</i><i>+</i></div></article><article class="feature-card card-custom"><div class="feature-icon icon-peach">${icon("spark", 21)}</div><span class="feature-kicker">MAKE IT YOURS</span><h3>Your look, your language</h3><p>Custom emoji, profile details, and thoughtful themes. Every customization is yours to use.</p><div class="custom-emoji-strip"><i>✨</i><i>🐸</i><i>💜</i><i>🌱</i></div></article></div>
      </section>
      <section class="manifesto" id="why-ucord"><div class="manifesto-inner wrap"><span class="eyebrow">NO TIERS. NO TRADE-OFFS.</span><h2>Your community deserves<br />the <em>whole</em> experience.</h2><p>Server tags, custom emoji, profile styling, all of it. ucord keeps the good stuff open to everyone.</p><button class="button button-light" data-action="auth-register">Come on in ${icon("arrow", 16)}</button><div class="manifesto-star">✧</div></div></section>
      <footer class="landing-footer wrap"><a class="brand" href="#top" data-action="top"><span class="brand-mark">u</span><span>ucord</span></a><span>A little more room for your people.</span><button data-action="auth-login">Already here? Log in</button></footer>
    </main>
  </div>`;
}

function authView() {
  const register = state.authMode === "register";
  const claiming = register && state.user?.guest;
  return `<main class="auth-page"><div class="auth-stars"></div><header class="auth-top"><a class="brand" href="#" data-action="back-home"><span class="brand-mark">u</span><span>ucord</span></a><span>${register ? "Already have an account?" : "New to ucord?"} <button class="text-button" data-action="switch-auth">${register ? "Log in" : "Create an account"}</button></span></header>
    <section class="auth-card"><div class="auth-card-mark">u</div><div class="auth-heading"><span class="eyebrow">${register ? claiming ? "KEEP YOUR SPACE" : "YOUR PEOPLE ARE HERE" : "GOOD TO HAVE YOU BACK"}</span><h1>${register ? claiming ? "Make this account yours" : "Create your account" : "Welcome back"}</h1><p>${register ? claiming ? "Keep your profile and spaces. Choose a username and password." : "Just the basics. You can make it yours later." : "Pick up right where you left off."}</p></div>
      <form id="auth-form" data-mode="${register ? "register" : "login"}" class="auth-form"><label>Username<input name="username" autocomplete="username" minlength="3" maxlength="20" pattern="[A-Za-z0-9_]+" placeholder="yourname" required /></label><label>Password<input name="password" type="password" autocomplete="${register ? "new-password" : "current-password"}" minlength="6" maxlength="256" placeholder="At least 6 characters" required /></label><p class="form-error" id="auth-error"></p><button class="button button-primary button-wide" type="submit">${register ? claiming ? "Claim my account" : "Create my account" : "Log in"} ${icon("arrow", 16)}</button></form>
      <div class="auth-divider"><span>or</span></div><button class="button button-outline button-wide" data-action="guest-start">Continue as a temporary guest</button><div class="auth-foot">One username. One password. That's it.</div></section><div class="auth-orbit orbit-auth-a"></div><div class="auth-orbit orbit-auth-b"></div></main>`;
}

function serverIcon(server, active = false) {
  const source = safeImageSrc(server.icon);
  return `<button class="server-icon ${active ? "is-active" : ""}" title="${esc(server.name)}" data-action="select-server" data-id="${esc(server.id)}">${source ? `<img src="${source}" alt="" />` : `<span>${initials(server.name)}</span>`}<i></i></button>`;
}

function homeContent() {
  const total = state.servers.length;
  return `<section class="home-content">
    <header class="home-page-heading"><div><span class="eyebrow">YOUR UCORD</span><h1>Welcome, ${esc(state.user.displayName || state.user.username)}</h1><p>Your spaces and conversations, all in one place.</p></div><div class="home-page-actions"><button class="home-action-secondary" data-action="set-area-discover">${icon("compass", 16)} Discover</button><button class="home-action-primary" data-action="open-create-server">${icon("plus", 16)} Create a space</button></div></header>
    <div class="home-rule"></div>
    <section class="home-spaces-section"><div class="home-section-heading"><h2>Your spaces</h2><span>${total}</span><button data-action="open-create-server" aria-label="Create a space">${icon("plus", 16)}</button></div>
      ${total ? `<div class="home-server-list">${state.servers.map((server) => { const source = safeImageSrc(server.icon); return `<button class="home-server-card" data-action="select-server" data-id="${esc(server.id)}"><span class="home-server-mark">${source ? `<img src="${source}" alt="" />` : initials(server.name)}</span><span class="home-server-copy"><b>${esc(server.name)}</b><small>${server.visibility === "public" ? "Public community" : "Private space"} · ${server.channels?.filter((c) => c.type === "text").length || 0} text channels</small></span>${icon("chevron", 17)}</button>`; }).join("")}</div>` : `<div class="home-empty-inline"><span class="home-empty-icon">${icon("users", 19)}</span><div><b>No spaces yet</b><p>Create a private place for friends or explore public communities.</p></div><button data-action="open-create-server">Create</button><button class="home-empty-discover" data-action="set-area-discover">Discover</button></div>`}
    </section>
    <p class="home-free-note"><span>✦</span> No tiers. Everything is included.</p>
  </section>`;
}

function channelSidebar() {
  if (!state.activeServer) return `<div class="sidebar-empty"><span>✦</span><h3>Your spaces, all in one place.</h3><p>Choose a community from the left or start a new one.</p><button class="button button-primary" data-action="open-create-server">${icon("plus", 16)} Create a space</button><button class="button button-quiet" data-action="set-area-discover">Browse discover</button></div>`;
  const server = state.activeServer;
  const canManage = hasServerPermission(server, state.user?.id, "manageChannels");
  const canManageRoles = hasServerPermission(server, state.user?.id, "manageRoles");
  const text = server.channels?.filter((c) => c.type === "text") || [];
  const voice = server.channels?.filter((c) => c.type === "voice") || [];
  const optionsOpen = state.modal?.type === "server-menu";
  return `<div class="server-heading"><button class="server-title" data-action="server-menu" aria-expanded="${optionsOpen}"><span>${esc(server.name)}</span>${icon("down", 15)}</button></div>${optionsOpen ? `<div class="server-options-menu"><div class="server-options-title">${esc(server.name)}</div><button data-action="open-invite">${icon("users", 16)} Invite people</button><button data-action="open-emojis"><span class="menu-glyph">✿</span> Custom emoji</button>${state.activeServer.ownerId === state.user?.id ? `<button data-action="open-server-settings">${icon("settings", 16)} Space settings</button>` : ""}${canManageRoles && state.activeServer.ownerId !== state.user?.id ? `<button data-action="open-server-roles">${icon("users", 16)} Roles &amp; members</button>` : ""}${canManage ? `<div class="server-options-divider"></div><button data-action="create-channel" data-type="text" ${text.length >= 20 ? "disabled" : ""}>${icon("hash", 16)} Add text channel</button><button data-action="create-channel" data-type="voice" ${voice.length >= 10 ? "disabled" : ""}>${icon("mic", 16)} Add voice room</button>` : ""}</div>` : ""}<div class="channel-list"><div class="channel-group"><div class="channel-group-heading"><span>TEXT CHANNELS <small>${text.length}/20</small></span>${canManage ? `<button title="Add text channel" data-action="create-channel" data-type="text" ${text.length >= 20 ? "disabled" : ""}>${icon("plus", 15)}</button>` : ""}</div>${text.map((channel) => `<button class="channel-row ${state.activeChannel?.id === channel.id ? "selected" : ""}" data-action="select-channel" data-id="${esc(channel.id)}">${icon("hash", 16)}<span>${esc(channel.name)}</span>${canManage && channel.id !== "general" ? `<i class="channel-settings" data-action="delete-channel" data-id="${esc(channel.id)}" title="Delete channel">×</i>` : ""}</button>`).join("")}</div><div class="channel-group"><div class="channel-group-heading"><span>VOICE ROOMS <small>${voice.length}/10</small></span>${canManage ? `<button title="Add voice room" data-action="create-channel" data-type="voice" ${voice.length >= 10 ? "disabled" : ""}>${icon("plus", 15)}</button>` : ""}</div>${voice.map((channel) => `<button class="channel-row ${state.activeChannel?.id === channel.id ? "selected" : ""}" data-action="select-channel" data-id="${esc(channel.id)}">${icon("mic", 16)}<span>${esc(channel.name)}</span><span class="voice-live-dot"></span>${canManage && channel.id !== "voice-general" ? `<i class="channel-settings" data-action="delete-channel" data-id="${esc(channel.id)}" title="Delete voice room">×</i>` : ""}</button>`).join("")}</div></div><div class="sidebar-spacer"></div><div class="server-tags-sidebar">${(server.tags || []).slice(0, 3).map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>`;
}

function discoverCard(server) {
  const tags = Array.isArray(server.tags) ? server.tags.filter((tag) => typeof tag === "string").slice(0, 5) : [];
  const joined = state.servers.some((s) => s.id === server.id);
  const source = safeImageSrc(server.icon);
  const memberCount = Math.max(1, Math.min(1_000_000_000, Math.floor(Number(server.memberCount) || 1)));
  return `<article class="discover-card"><div class="discover-cover ${accentClass(server.accent)}"><span class="cover-orb"></span><span class="cover-mark">${source ? `<img src="${source}" alt="" />` : initials(server.name)}</span><span class="cover-spark">✦</span></div><div class="discover-card-content"><div class="discover-title-row"><h3>${esc(server.name)}</h3><span class="public-chip">${icon("globe", 12)} Public</span></div><p>${esc(server.description || "No description added yet.")}</p>${tags.length ? `<div class="tag-list">${tags.slice(0, 4).map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>` : ""}<div class="discover-card-footer"><span><i></i>${memberCount} ${memberCount === 1 ? "member" : "members"}</span><button class="button ${joined ? "button-joined" : "button-primary"}" data-action="${joined ? "select-server" : "join-server"}" data-id="${esc(server.id)}">${joined ? "Open space" : "Join space"} ${icon("arrow", 14)}</button></div></div></article>`;
}

function discoverContent() {
  return `<section class="discover-page"><div class="discover-hero"><div><span class="eyebrow">A BIG WORLD, A LOT OF LITTLE CORNERS</span><h1>Find your people.</h1><p>Meet communities that share what you love.</p></div><div class="discover-hero-mark">${icon("compass", 43)}<span>✦</span></div></div><div class="discover-toolbar"><div class="discover-filters">${["All", "Creative", "Gaming", "Study", "Friends"].map((filter) => `<button class="filter-chip ${state.filter === filter ? "active" : ""}" data-action="filter-discover" data-filter="${filter}">${filter}</button>`).join("")}</div><label class="discover-search">${icon("search", 16)}<input id="discover-search" placeholder="Search communities" value="${esc(state.discoverSearch)}" /></label></div><div class="discover-heading"><div><span class="eyebrow">OPEN DOORS</span><h2>Communities to explore</h2></div><span class="results-count" id="discover-count"></span></div><div class="discover-grid" id="discover-grid">${renderDiscoverGrid()}</div><div class="discover-own"><span>Got a community of your own?</span><button class="text-button" data-action="open-create-server">Create a space ${icon("arrow", 14)}</button></div></section>`;
}

function renderDiscoverGrid() {
  const query = state.discoverSearch.toLowerCase().trim();
  return state.publicServers?.filter((server) => {
    if (server.visibility !== "public") return false;
    const joined = state.servers.some((s) => s.id === server.id);
    if (joined && server.ownerId === state.user?.id) return false;
    if (query && !`${server.name} ${server.description || ""} ${(server.tags || []).join(" ")}`.toLowerCase().includes(query)) return false;
    if (state.filter !== "All" && !(server.tags || []).some((tag) => tag.toLowerCase().includes(state.filter.toLowerCase()))) return false;
    return true;
  }).map(discoverCard).join("") || `<div class="discover-empty"><span>✧</span><b>No spaces found yet</b><p>Try another search, or be the first to start one.</p><button class="button button-primary" data-action="open-create-server">Create a space</button></div>`;
}

function dmContent() {
  if (state.currentDM) {
    return `<section class="dm-view"><header class="conversation-header"><button class="mobile-menu" data-action="toggle-sidebar" title="Open navigation">${icon("more", 18)}</button>${avatar(state.currentDM)}<div><b>${esc(state.currentDM.displayName || state.currentDM.username)}</b><small>@${esc(state.currentDM.username)}</small></div><button class="icon-button" data-action="view-profile" data-id="${esc(state.currentDM.id)}" title="View profile">${icon("users", 17)}</button></header><div class="conversation-scroll"><div class="conversation-welcome">${avatar(state.currentDM, "avatar-xl")}<h2>${esc(state.currentDM.displayName || state.currentDM.username)}</h2><p>@${esc(state.currentDM.username)} · your conversation starts here</p></div><div class="message-list dm-message-list" id="message-list">${renderMessages(state.dmMessages, null)}</div></div>${composer("dm")}</section>`;
  }
  return `<section class="dm-empty-page"><div class="dm-empty-illustration"><span class="dm-bubble bubble-a">hey!</span><span class="dm-bubble bubble-b">✦</span><span class="dm-orbit">${icon("chat", 48)}</span><i>✧</i><b>✦</b></div><span class="eyebrow">A LITTLE HELLO GOES A LONG WAY</span><h1>Start a conversation.</h1><p>Find someone by their username and say hi, or pick up a recent chat.</p><form id="find-person-form" class="find-person-form"><label>${icon("search", 17)}<input name="username" placeholder="Find someone by username" maxlength="20" required autocomplete="off" /><button class="button button-primary" type="submit">Find person</button></label></form><div class="dm-tip">Search is exact, so your people are easy to find.</div></section>`;
}

function renderMessages(messages, server) {
  if (!messages?.length) return `<div class="message-empty"><span>✦</span><p>You're all caught up.<br />Start the conversation.</p></div>`;
  const customEmoji = availableCustomEmojis(server);
  return messages.slice(-250).filter((message) => message && typeof message === "object").map((message) => {
    let body = esc(cleanText(message.body, 1800));
    for (const emoji of customEmoji) body = body.replaceAll(`:${emoji.name}:`, `<img class="inline-emoji" src="${safeImageSrc(emoji.src)}" alt=":${emoji.name}:" title=":${emoji.name}:" />`);
    const timestamp = safeNumber(message.at, Date.now());
    const date = new Date(Number.isFinite(timestamp) && timestamp > 0 ? timestamp : Date.now());
    const stamp = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const source = safeImageSrc(message.avatar);
    return `<article class="message-row"><div class="message-avatar">${source ? `<img src="${source}" alt="" />` : initials(message.author || "u")}</div><div class="message-body"><header><b>${esc(cleanText(message.author || "member", 32))}</b><time>${stamp}</time></header><p>${body}</p></div></article>`;
  }).join("");
}

function composer(kind = "channel") {
  const emoji = availableCustomEmojis();
  const key = composerKey(kind);
  const draft = state.composerDrafts[key]?.value || "";
  return `<form class="composer" id="message-form" data-kind="${kind}" data-composer-key="${esc(key)}"><button type="button" class="composer-plus" data-action="composer-emoji" title="Add emoji">${icon("smile", 19)}</button><input name="body" value="${esc(draft)}" placeholder="${kind === "dm" ? `Message ${esc(state.currentDM?.displayName || "your person")}` : `Message #${esc(state.activeChannel?.name || "general")}`}" autocomplete="off" maxlength="1800" /><div class="composer-tools">${emoji.length ? `<button type="button" data-action="composer-emoji" title="Custom emoji">✿</button>` : ""}<button class="composer-send" type="submit" title="Send message">${icon("send", 17)}</button></div></form>`;
}

function composerKey(kind) {
  return kind === "dm"
    ? `dm:${safeKey(state.currentDM?.id) || "none"}`
    : `channel:${safeKey(state.activeServer?.id) || "none"}:${safeKey(state.activeChannel?.id) || "none"}`;
}

function availableCustomEmojis(preferredServer = state.activeServer) {
  const servers = [preferredServer, ...state.servers].filter((server, index, list) => server && list.findIndex((item) => item.id === server.id) === index);
  const byName = new Map();
  for (const server of servers) {
    for (const emoji of Array.isArray(server.emojis) ? server.emojis.slice(0, 50) : []) {
      if (!/^[a-z0-9_]{2,24}$/.test(emoji?.name) || !safeImageSrc(emoji?.src) || byName.has(emoji.name)) continue;
      byName.set(emoji.name, { name: emoji.name, src: safeImageSrc(emoji.src), serverName: server.name });
    }
  }
  return [...byName.values()].slice(0, 250);
}

function textChannelContent() {
  const channel = state.activeChannel || state.activeServer?.channels?.find((c) => c.type === "text");
  if (!channel) return `<div class="empty-channel"><span>${icon("hash", 25)}</span><h2>No text channels yet.</h2><p>Add a channel when you're ready to start talking.</p><button class="button button-primary" data-action="create-channel" data-type="text">${icon("plus", 16)} Add a channel</button></div>`;
  const source = safeImageSrc(state.activeServer.icon);
  return `<section class="chat-view"><header class="chat-topbar"><button class="mobile-menu" data-action="toggle-sidebar" title="Open space channels">${icon("more", 18)}</button><div class="chat-location">${icon("hash", 18)}<b>${esc(channel.name)}</b><i></i><span>${esc(state.activeServer.name)}</span></div></header><div class="chat-content"><div class="channel-welcome">${source ? `<img class="channel-server-mark" src="${source}" alt="" />` : `<span class="channel-server-mark">${initials(state.activeServer.name)}</span>`}<h2>Welcome to #${esc(channel.name)}</h2><p>This is the beginning of a good conversation in <b>${esc(state.activeServer.name)}</b>.</p></div><div class="message-list" id="message-list">${renderMessages(state.messages, state.activeServer)}</div></div>${composer()}</section>`;
}

function voiceContent() {
  const channel = state.activeChannel;
  return `<section class="voice-view"><header class="chat-topbar"><button class="mobile-menu" data-action="toggle-sidebar" title="Open space channels">${icon("more", 18)}</button><div class="chat-location">${icon("mic", 18)}<b>${esc(channel?.name || "Voice room")}</b><i></i><span>${esc(state.activeServer.name)}</span></div></header><div class="voice-center"><div class="voice-rings"><span></span><span></span><span class="voice-core">${icon("mic", 34)}</span><i>✦</i></div><span class="eyebrow">VOICE ROOM</span><h1>${esc(channel?.name || "Voice room")}</h1><p>Come hang out. Your room is ready whenever you are.</p><div class="voice-members" id="voice-members">${voiceMemberMarkup(state.voiceMembers)}</div><div class="voice-controls">${state.voiceJoined ? `<button class="button button-outline voice-mute" data-action="toggle-mute">${icon("mic", 16)} ${state.voiceMuted ? "Unmute" : "Mute"}</button>` : ""}<button class="button ${state.voiceJoined ? "button-outline voice-leave" : "button-primary"} voice-join" data-action="toggle-voice" ${state.voiceConnecting ? "disabled" : ""}>${icon("mic", 17)} ${state.voiceConnecting ? "Connecting…" : state.voiceJoined ? "Leave voice room" : "Join voice room"}</button></div><small class="voice-hint">Joining connects your microphone. Your voice stays in this room.</small><div id="voice-audios" hidden></div></div></section>`;
}

function appContent() {
  if (state.area === "discover") return discoverContent();
  if (state.area === "messages") return dmContent();
  if (!state.activeServer) return homeContent();
  if (state.activeChannel?.type === "voice") return voiceContent();
  return textChannelContent();
}

function sidebarAccount(user) {
  return `<div class="sidebar-bottom"><button class="account-button" data-action="view-self">${avatar(user)}<span class="account-label"><b>${esc(user.displayName || user.username)}</b><small>${user.guest ? "Temporary guest" : `@${esc(user.username)}`}</small></span>${icon("more", 18)}</button><div class="account-actions"><button title="Customize your profile" data-action="open-customize">${icon("spark", 16)} Customize</button><button title="Account options" data-action="account-menu">${icon("settings", 16)}</button></div></div>`;
}

function homeSidebarSpaces() {
  const query = cleanText(state.homeSearch, 100).toLowerCase();
  const spaces = state.servers.filter((server) => !query || server.name.toLowerCase().includes(query));
  if (!spaces.length) return state.servers.length
    ? `<div class="sidebar-no-spaces"><p>No matching spaces.</p></div>`
    : `<div class="sidebar-no-spaces"><span>✦</span><p>Your spaces will show up here.</p><button data-action="open-create-server">Make the first one</button></div>`;
  return spaces.map((server) => {
    const source = safeImageSrc(server.icon);
    return `<button class="sidebar-space" data-action="select-server" data-id="${esc(server.id)}"><span class="sidebar-space-icon">${source ? `<img src="${source}" alt="" />` : initials(server.name)}</span><span class="sidebar-space-name">${esc(server.name)}</span>${server.visibility === "public" ? `<span class="space-public-dot" title="Public"></span>` : ""}</button>`;
  }).join("");
}

function workspaceSidebar(user, active) {
  if (state.area === "space" && active) {
    return `<aside class="workspace-sidebar server-area-sidebar"><div class="active-server-panel">${channelSidebar()}</div>${sidebarAccount(user)}</aside>`;
  }
  const brand = `<div class="sidebar-brand"><a class="brand" href="#" data-action="go-home"><span class="brand-mark">u</span><span>ucord</span></a></div>`;
  let contents = "";
  if (state.area === "discover") {
    contents = `<div class="sidebar-context"><span class="eyebrow">EXPLORE</span><h2>Discover</h2><p>Find a public community or start one of your own.</p><button class="context-action" data-action="open-create-server">${icon("plus", 16)} Create a space</button></div>`;
  } else if (state.area === "messages") {
    contents = `<div class="sidebar-context"><span class="eyebrow">YOUR PEOPLE</span><h2>Messages</h2><p>Look up someone by username to start a conversation.</p></div>`;
  } else {
    contents = `<div class="sidebar-search"><span>${icon("search", 15)}</span><input placeholder="Search your spaces" id="global-search" value="${esc(state.homeSearch)}" autocomplete="off" /></div><div class="sidebar-mainnav"><button class="nav-row selected" data-action="go-home"><span class="nav-row-icon">${icon("home", 17)}</span> Home <span class="nav-unread"></span></button><button class="nav-row" data-action="set-area-messages"><span class="nav-row-icon">${icon("chat", 17)}</span> Messages</button><button class="nav-row" data-action="set-area-discover"><span class="nav-row-icon">${icon("compass", 17)}</span> Discover</button></div><div class="sidebar-divider"></div><div class="sidebar-spaces-head"><div><span class="eyebrow">YOUR SPACES</span><span class="space-count">${state.servers.length}</span></div><button class="icon-button small" data-action="open-create-server" title="Create a space">${icon("plus", 17)}</button></div><div class="sidebar-space-list">${homeSidebarSpaces()}</div>`;
  }
  return `<aside class="workspace-sidebar area-sidebar">${brand}${contents}${sidebarAccount(user)}</aside>`;
}

function appView() {
  const user = state.user;
  const active = state.activeServer;
  const accent = safeAccent(user.accent);
  const frameClass = `${user.compact ? "workspace compact-mode" : "workspace"}${state.sidebarOpen ? " mobile-sidebar-open" : ""}`;
  return `<div class="${frameClass} ${accentClass(accent)}" data-theme="${user.theme}"><aside class="icon-rail"><a href="#" class="rail-home ${state.area === "home" && !active ? "current" : ""}" title="Home" data-action="go-home">u</a><div class="rail-group"><button class="rail-button ${state.area === "home" ? "current" : ""}" title="Home" data-action="go-home">${icon("home", 19)}<i></i></button><button class="rail-button ${state.area === "messages" ? "current" : ""}" title="Messages" data-action="set-area-messages">${icon("chat", 19)}<i></i></button><button class="rail-button ${state.area === "discover" ? "current" : ""}" title="Discover" data-action="set-area-discover">${icon("compass", 19)}<i></i></button></div><div class="rail-divider"></div><div class="rail-servers">${state.servers.map((server) => serverIcon(server, active?.id === server.id)).join("")}<button class="rail-add" title="Create a space" data-action="open-create-server">${icon("plus", 20)}</button><button class="rail-explore" title="Discover communities" data-action="set-area-discover">${icon("compass", 18)}</button></div><div class="rail-bottom"><button class="rail-avatar" title="Your profile" data-action="view-self">${avatar(user)}</button></div></aside>
    ${workspaceSidebar(user, active)}<main class="workspace-main">${appContent()}</main>${state.modal && state.modal.type !== "server-menu" ? renderModal() : ""}</div>`;
}

function modalFrame(title, subtitle, body, width = "") {
  return `<div class="modal-backdrop" data-action="close-modal"><section class="modal-card ${width}" role="dialog" aria-modal="true" aria-label="${esc(title)}" data-stop><button class="modal-close" data-action="close-modal" title="Close">${icon("close", 17)}</button><div class="modal-heading"><span class="modal-heading-mark">✦</span><div><h2>${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div></div>${body}</section></div>`;
}

function renderModal() {
  const modal = state.modal;
  if (!modal) return "";
  if (modal.type === "create-server") return modalFrame("Create your space", "A place for your people to talk, share, and hang out.", `<form id="create-server-form" class="modal-form"><label>Space name<input name="name" placeholder="Choose a name" maxlength="48" required autofocus /></label><label>What is this space about?<textarea name="description" rows="2" placeholder="Add a short description" maxlength="180"></textarea></label><div class="form-label">Who can find this space?</div><div class="visibility-options"><label class="visibility-option"><input type="radio" name="visibility" value="private" checked /><span class="visibility-icon">${icon("lock", 18)}</span><span><b>Private</b><small>Only people with an invite can join.</small></span><i></i></label><label class="visibility-option"><input type="radio" name="visibility" value="public" /><span class="visibility-icon">${icon("globe", 18)}</span><span><b>Public</b><small>Show up in Discover for everyone.</small></span><i></i></label></div><div class="form-tip">You can switch visibility in space settings anytime.</div><button class="button button-primary button-wide" type="submit">Create my space ${icon("arrow", 15)}</button></form>`, "modal-wide");
  if (modal.type === "channel") return modalFrame(modal.channelType === "voice" ? "Add a voice room" : "Add a text channel", "Every space can have up to 20 text and 10 voice channels.", `<form id="create-channel-form" data-channel-type="${esc(modal.channelType)}" class="modal-form"><label>Channel name<input name="name" placeholder="${modal.channelType === "voice" ? "e.g. cozy corner" : "e.g. photos-and-art"}" maxlength="32" required autofocus /></label><div class="channel-type-note">${icon(modal.channelType === "voice" ? "mic" : "hash", 17)} <span>${modal.channelType === "voice" ? "Voice room" : "Text channel"}</span><span class="small-limit">${modal.channelType === "voice" ? `${state.activeServer?.channels.filter((c) => c.type === "voice").length || 0}/10` : `${state.activeServer?.channels.filter((c) => c.type === "text").length || 0}/20`}</span></div><button class="button button-primary button-wide" type="submit">Create channel</button></form>`, "modal-narrow");
  if (modal.type === "invite") {
    const server = state.activeServer;
    const link = `${location.origin}/?invite=${encodeURIComponent(server.inviteCode)}`;
    return modalFrame("Bring your people in", `Invite anyone into ${esc(server.name)}.`, `<div class="invite-card"><span class="invite-icon">${icon("users", 20)}</span><div><b>Share an invite</b><small>${server.visibility === "public" ? "Anyone with the link can join this public space." : "Only people with this link can find and join."}</small></div></div><label class="modal-label">INVITE LINK</label><div class="copy-field"><input id="invite-link" value="${esc(link)}" readonly /><button class="button button-primary" data-action="copy-invite">Copy link</button></div><div class="invite-divider"><span>or</span></div><form id="join-code-form" class="join-code-form"><label>Have an invite code?<input name="code" value="${esc(state.pendingInvite)}" maxlength="256" placeholder="Paste a ucord invite" /></label><button class="button button-outline" type="submit">Join a space</button></form>`, "modal-wide");
  }
  if (modal.type === "server-settings") return serverSettingsModal(modal.tab || "overview");
  if (modal.type === "emojis") return emojiModal();
  if (modal.type === "customize") return customizeModal(modal.tab || "profile");
  if (modal.type === "profile") return profileModal(normalizeProfile(modal.profile || state.user));
  if (modal.type === "emoji-picker") return modalFrame("Pick an emoji", "Use your custom emoji in any conversation.", `<div class="emoji-picker-grid">${EMOJIS.map((emoji) => `<button data-action="insert-emoji" data-value="${emoji}">${emoji}</button>`).join("")}${availableCustomEmojis().map((emoji) => `<button data-action="insert-emoji" data-value=":${esc(emoji.name)}:" title=":${esc(emoji.name)}: · ${esc(emoji.serverName)}"><img src="${esc(emoji.src)}" alt=":${esc(emoji.name)}:" /></button>`).join("")}</div>`, "modal-narrow");
  if (modal.type === "account") return modalFrame("Your account", "You can keep this session or sign out.", `<div class="account-modal-user">${avatar(state.user, "avatar-lg")}<div><b>${esc(state.user.displayName || state.user.username)}</b><small>${state.user.guest ? "Temporary guest" : `@${esc(state.user.username)}`}</small></div></div><div class="account-modal-actions"><button class="button button-outline button-wide" data-action="open-customize">${icon("spark", 16)} Customize your profile</button>${state.user.guest ? `<button class="button button-outline button-wide" data-action="auth-register">Create a permanent account</button>` : ""}<button class="button button-danger-quiet button-wide" data-action="sign-out">Sign out</button></div>`, "modal-narrow");
  return "";
}

function serverSettingsModal(tab) {
  const server = state.activeServer;
  if (!server) return "";
  const isOwner = server.ownerId === state.user?.id;
  const canManageRoles = hasServerPermission(server, state.user?.id, "manageRoles");
  const tabs = isOwner
    ? [["overview", "Overview", "spark"], ["visibility", "Visibility & tags", "globe"], ["emoji", "Custom emoji", "smile"], ...(canManageRoles ? [["roles", "Roles & members", "users"]] : [])]
    : canManageRoles ? [["roles", "Roles & members", "users"]] : [];
  let content = "";
  if (tab === "overview") content = `<form id="server-overview-form" class="settings-form"><div class="settings-form-grid"><label>Space name<input name="name" value="${esc(server.name)}" maxlength="48" required /></label><label>Short description<textarea name="description" rows="3" maxlength="180" placeholder="A little about this space">${esc(server.description || "")}</textarea></label><div class="server-icon-field"><span class="form-label">Space icon</span><span class="profile-photo-fields"><span class="profile-photo-copy"><small>Square PNG, JPG, GIF, or WebP · up to 240 KB</small><label class="button button-outline file-pick">${icon("image", 15)} Choose icon<input type="file" name="serverIcon" accept="image/png,image/jpeg,image/gif,image/webp" /></label></span>${server.icon ? `<img class="server-icon-preview" src="${safeImageSrc(server.icon)}" alt="Current space icon" />` : `<span class="server-icon-preview">${initials(server.name)}</span>`}</span></div><label>Space accent<span class="color-swatches">${ACCENTS.map((color, index) => `<input type="radio" class="accent-${index}" name="accent" value="${color}" ${server.accent === color ? "checked" : ""} aria-label="${color}" />`).join("")}</span></label><div class="settings-info"><span>${icon("users", 17)}</span><div><b>${safeNumber(server.memberCount, 1)} members</b><small>Created ${new Date(server.createdAt).toLocaleDateString()}</small></div></div></div><div class="settings-save-row"><span>Changes show up across your space.</span><button class="button button-primary" type="submit">Save changes</button></div></form>`;
  if (tab === "visibility") content = `<form id="server-visibility-form" class="settings-form"><div class="settings-section-title"><span class="eyebrow">WHO CAN FIND YOU</span><h3>Choose your visibility</h3><p>Every space can be public or private, and you can switch whenever you like.</p></div><div class="visibility-options settings-options"><label class="visibility-option"><input type="radio" name="visibility" value="private" ${server.visibility === "private" ? "checked" : ""} /><span class="visibility-icon">${icon("lock", 18)}</span><span><b>Private space</b><small>Only people with an invite link can join.</small></span><i></i></label><label class="visibility-option"><input type="radio" name="visibility" value="public" ${server.visibility === "public" ? "checked" : ""} /><span class="visibility-icon">${icon("globe", 18)}</span><span><b>Public community</b><small>Anyone can find and join you in Discover. Invite links still work.</small></span><i></i></label></div><label class="tag-editor-label">Discover tags <small>Free for every space · up to 5</small><input name="tags" value="${esc((server.tags || []).join(", "))}" placeholder="creative, cozy, gaming" /></label><span class="field-hint">Separate tags with commas. They help the right people find your community.</span><div class="settings-save-row"><span>${server.visibility === "public" ? "Visible in Discover" : "Hidden from Discover"}</span><button class="button button-primary" type="submit">Save visibility</button></div></form>`;
  if (tab === "emoji") content = `<div class="emoji-settings"><div class="settings-section-title"><span class="eyebrow">MAKE IT YOURS</span><h3>Custom emoji</h3><p>Upload emoji for everyone in your space to use in any channel. Every member can use them, everywhere.</p></div><button class="button button-primary" data-action="open-emojis">${icon("plus", 16)} Add custom emoji</button>${server.emojis?.length ? `<div class="emoji-settings-grid">${server.emojis.map((emoji) => `<div class="emoji-settings-item"><img src="${esc(emoji.src)}" alt="" /><span>:${esc(emoji.name)}:</span><button title="Remove emoji" data-action="delete-emoji" data-name="${esc(emoji.name)}">×</button></div>`).join("")}</div>` : `<div class="emoji-empty"><span>✿</span><b>No custom emoji yet</b><small>Make the first one for your space.</small></div>`}<div class="settings-footnote">Custom emoji are free. No tiers, no unlocks.</div></div>`;
  if (tab === "roles") content = rolesSettings(server);
  const body = `<div class="settings-layout"><nav class="settings-nav">${tabs.map(([id, label, glyph]) => `<button class="settings-tab ${tab === id ? "active" : ""}" data-action="settings-tab" data-tab="${id}">${icon(glyph, 16)}<span>${label}</span>${tab === id ? `<i></i>` : ""}</button>`).join("")}<div class="settings-nav-note"><span>✦</span><b>Good things,<br />all included.</b><small>Every ucord space gets the full toolkit.</small></div></nav><div class="settings-panel">${content}</div></div>`;
  return modalFrame(`Space settings`, esc(server.name), body, "modal-settings");
}

function rolePermissionChecks(permissions = {}, canGrantRoles = false) {
  const labels = [["manageChannels", "Manage channels"], ["manageEmojis", "Manage custom emoji"], ["manageRoles", "Manage roles"]];
  return labels.map(([key, label]) => `<label class="role-permission"><input type="checkbox" name="permission" value="${key}" ${permissions[key] ? "checked" : ""} ${key === "manageRoles" && !canGrantRoles ? "disabled" : ""} /><span>${label}</span></label>`).join("");
}

function rolesSettings(server) {
  const canManage = hasServerPermission(server, state.user?.id, "manageRoles");
  const canGrantRoles = server.ownerId === state.user?.id;
  const roles = server.roles || [];
  const roleEditors = roles.map((role) => `<form class="role-editor" data-role-id="${esc(role.id)}"><div class="role-editor-heading"><span class="role-dot" style="--role-color:${safeAccent(role.color)}"></span><b>${esc(role.name)}</b><button type="button" class="icon-button small" data-action="delete-role" data-id="${esc(role.id)}" title="Delete role">${icon("close", 14)}</button></div><label>Role name<input name="name" value="${esc(role.name)}" maxlength="32" required /></label><label>Role color<span class="color-swatches">${ACCENTS.map((color, index) => `<input type="radio" class="accent-${index}" name="color" value="${color}" ${role.color === color ? "checked" : ""} aria-label="${color}" />`).join("")}</span></label><div class="role-permissions">${rolePermissionChecks(role.permissions, canGrantRoles)}</div><button class="button button-outline" type="submit">Save role</button></form>`).join("");
  const memberRows = state.serverMembers.map((member) => {
    const assigned = server.memberRoles?.[member.id] || [];
    return `<form class="member-role-row" data-member-id="${esc(member.id)}"><span class="member-role-identity">${avatar(member)}<span><b>${esc(member.displayName || member.username)}</b><small>${member.id === server.ownerId ? "Space owner" : `@${esc(member.username)}`}</small></span></span><div class="member-role-options">${roles.length ? roles.map((role) => `<label><input type="checkbox" name="roleId" value="${esc(role.id)}" ${assigned.includes(role.id) ? "checked" : ""} ${!canGrantRoles && role.permissions?.manageRoles && !assigned.includes(role.id) ? "disabled" : ""} /><span style="--role-color:${safeAccent(role.color)}">${esc(role.name)}</span></label>`).join("") : `<small>Create a role to assign it to members.</small>`}</div><button class="button button-outline" type="submit" ${canManage ? "" : "disabled"}>Save roles</button></form>`;
  }).join("");
  return `<section class="roles-settings"><div class="settings-section-title"><span class="eyebrow">SPACE ACCESS</span><h3>Roles &amp; members</h3><p>Create roles, choose what they can manage, and assign them to members of this space.</p></div>${canManage ? `<form id="create-role-form" class="create-role-form"><label>New role<input name="name" maxlength="32" placeholder="Role name" required /></label><label>Role color<span class="color-swatches">${ACCENTS.map((color, index) => `<input type="radio" class="accent-${index}" name="color" value="${color}" ${index === 0 ? "checked" : ""} aria-label="${color}" />`).join("")}</span></label><div class="role-permissions">${rolePermissionChecks({}, canGrantRoles)}</div><button class="button button-primary" type="submit" ${roles.length >= 20 ? "disabled" : ""}>${icon("plus", 15)} Add role ${roles.length}/20</button></form>` : ""}<div class="role-editor-list">${roleEditors || `<div class="emoji-empty"><b>No roles yet</b><small>Add a role to give members extra server controls.</small></div>`}</div><div class="server-members-list"><div class="role-list-heading"><h4>Members</h4><span>${state.serverMembers.length}${server.memberCount > state.serverMembers.length ? ` of ${server.memberCount}` : ""}</span></div>${memberRows || `<div class="emoji-empty"><small>Member list is not available right now.</small></div>`}</div></section>`;
}

function emojiModal() {
  const server = state.activeServer;
  const emojis = server?.emojis || [];
  const canManage = hasServerPermission(server, state.user?.id, "manageEmojis");
  const uploadForm = canManage
    ? `<div class="emoji-upload-zone"><div class="upload-spark">✦</div><b>Give your space a new favorite</b><p>Square PNG, JPG, GIF, or WebP · up to 160 KB</p><form id="emoji-upload-form"><label class="button button-outline upload-button">${icon("image", 16)} Choose an image<input type="file" name="emojiFile" accept="image/png,image/jpeg,image/gif,image/webp" required /></label><label>Emoji name<input name="emojiName" placeholder="goodvibes" maxlength="24" pattern="[A-Za-z0-9_]+" required /></label><button class="button button-primary" type="submit">Add emoji ${icon("arrow", 14)}</button></form><div class="emoji-free-note">✦　Free for every member. Ready to use in any channel.</div></div>`
    : `<div class="emoji-readonly-note">✿　These custom emoji are ready for you to use in any channel.</div>`;
  return modalFrame("Your emoji, everywhere", `Create a little language for ${esc(server?.name || "your space")} and let everyone use it.`, `${uploadForm}<div class="emoji-modal-list"><div class="emoji-modal-list-heading"><span>YOUR SPACE EMOJI</span><span>${emojis.length} ${emojis.length === 1 ? "emoji" : "emoji"}</span></div>${emojis.length ? `<div class="emoji-settings-grid">${emojis.map((emoji) => `<div class="emoji-settings-item"><img src="${esc(emoji.src)}" alt="" /><span>:${esc(emoji.name)}:</span>${canManage ? `<button title="Remove emoji" data-action="delete-emoji" data-name="${esc(emoji.name)}">×</button>` : ""}</div>`).join("")}</div>` : `<div class="emoji-empty compact"><span>✿</span><small>Your custom emoji will show up here.</small></div>`}</div>`, "modal-wide");
}

function customizeModal(tab) {
  const user = state.user;
  const tabs = [["profile", "Profile", "users"], ["appearance", "Appearance", "spark"]];
  let content;
  if (tab === "appearance") content = `<form id="appearance-form" class="customize-form"><div class="settings-section-title"><span class="eyebrow">YOUR SPACE, YOUR FEEL</span><h3>Pick a mood.</h3><p>Every theme and profile detail is yours to personalize.</p></div><div class="customize-block"><b>Workspace theme</b><span>Choose a backdrop that feels right.</span><div class="theme-options">${[["midnight", "Midnight"], ["dusk", "Ember"], ["moss", "Ash"]].map(([id, name]) => `<label class="theme-choice theme-${id} ${user.theme === id ? "selected" : ""}"><input type="radio" name="theme" value="${id}" ${user.theme === id ? "checked" : ""}/><span class="theme-swatch"><i></i><i></i><i></i></span><b>${name}</b></label>`).join("")}</div></div><div class="customize-block"><b>Accent color</b><span>Give the little details your color.</span><div class="customize-swatches">${ACCENTS.map((color, index) => `<label class="customize-swatch accent-${index} ${user.accent === color ? "selected" : ""}"><input type="radio" name="accent" value="${color}" ${user.accent === color ? "checked" : ""}/><i>${user.accent === color ? "✓" : ""}</i></label>`).join("")}</div></div><label class="toggle-row"><span><b>Compact message spacing</b><small>Fit a little more conversation on screen.</small></span><input name="compact" type="checkbox" ${user.compact ? "checked" : ""}/><i></i></label><div class="customize-save"><span>Every setting is included, always.</span><button class="button button-primary" type="submit">Save appearance</button></div></form>`;
  else content = `<form id="profile-form" class="customize-form"><div class="profile-preview-mini"><div class="profile-preview-banner ${accentClass(user.accent)}"></div><div class="profile-preview-body">${avatar(user, "avatar-lg")}<div><b>${esc(user.displayName || user.username)}</b><small>@${esc(user.username)} ${user.guest ? "· guest" : ""}</small></div><span>PROFILE PREVIEW</span></div></div><div class="profile-form-grid"><label>Display name<input name="displayName" value="${esc(user.displayName || user.username)}" maxlength="32" required /></label><label>About you<textarea name="bio" rows="3" maxlength="180" placeholder="A little about yourself">${esc(user.bio || "")}</textarea></label><div class="profile-photo-fields"><div class="profile-photo-copy"><b>Profile picture</b><small>Square image, up to 240 KB</small><label class="button button-outline file-pick">${icon("image", 15)} Choose image<input type="file" name="avatarFile" accept="image/png,image/jpeg,image/gif,image/webp" /></label></div><div class="avatar-current">${avatar(user, "avatar-lg")}</div></div><div class="profile-tags-block"><b>Your profile tags <small>Show people what you love · up to 5</small></b><input name="profileTags" value="${esc((user.tags || []).join(", "))}" placeholder="music, art, game nights" /></div></div><div class="customize-save"><span>Only the details you choose are shown on your profile.</span><button class="button button-primary" type="submit">Save profile</button></div></form>`;
  const body = `<div class="customize-layout"><nav class="customize-nav">${tabs.map(([id, label, glyph]) => `<button class="settings-tab ${tab === id ? "active" : ""}" data-action="customize-tab" data-tab="${id}">${icon(glyph, 16)}<span>${label}</span>${tab === id ? `<i></i>` : ""}</button>`).join("")}<div class="customize-nav-callout"><span>✧</span><b>All yours.</b><small>No locked choices. Make ucord feel like home.</small></div></nav><div class="customize-panel">${content}</div></div>`;
  return modalFrame("Make it yours", "Your profile and your workspace, just how you like them.", body, "modal-customize");
}

function profileModal(profile) {
  if (!profile) return "";
  const mine = profile.id === state.user?.id;
  const body = `<div class="profile-view-card"><div class="profile-view-cover ${accentClass(profile.accent)}"><div class="profile-cover-stars">✦　✧</div></div><div class="profile-view-body">${avatar(profile, "profile-view-avatar")}<div class="profile-view-title"><div><h3>${esc(profile.displayName || profile.username)}</h3><span>@${esc(profile.username)}${profile.guest ? " · temporary guest" : ""}</span></div>${mine ? `<button class="button button-outline" data-action="open-customize">${icon("edit", 14)} Edit profile</button>` : `<button class="button button-primary" data-action="start-dm" data-id="${esc(profile.id)}">${icon("chat", 15)} Message</button>`}</div><div class="profile-view-divider"></div><span class="eyebrow">ABOUT</span><p class="profile-bio">${esc(profile.bio || (mine ? "Add a little about yourself in customization." : "Keeping it simple."))}</p>${profile.tags?.length ? `<div class="profile-view-tags">${profile.tags.map((tag) => `<span>${esc(tag)}</span>`).join("")}</div>` : ""}<div class="profile-joined">${icon("spark", 14)} Here since ${new Date(profile.joinedAt || Date.now()).toLocaleDateString([], { month: "long", year: "numeric" })}</div></div></div>`;
  return modalFrame("Profile", "Just the profile.", body, "modal-profile");
}

function render() {
  clearInterval(messagePoll);
  if (state.route === "landing") app.innerHTML = landingView();
  else if (state.route === "auth") app.innerHTML = authView();
  else {
    app.innerHTML = appView();
    if (state.activeServer && state.activeChannel?.type === "text" || state.currentDM) resetPoll();
    const messageList = document.querySelector("#message-list");
    if (messageList) messageList.scrollTop = messageList.scrollHeight;
  }
}

async function selectServer(serverId) {
  serverId = safeKey(serverId);
  if (!serverId) return toast("That space could not be found.", "error");
  if (state.voiceJoined) await leaveVoiceRoom();
  const cachedServer = state.servers.find((item) => item.id === serverId);
  let server = null;
  try { server = normalizeServer(await db.get(`servers/${serverId}`), serverId); } catch { server = cachedServer || null; }
  if (!server) return toast("That space could not be found.", "error");
  const cachedIndex = state.servers.findIndex((item) => item.id === server.id);
  if (cachedIndex >= 0) state.servers[cachedIndex] = server;
  else state.servers.push(server);
  state.activeServer = server;
  state.area = "space";
  state.modal = null;
  state.currentDM = null;
  await loadServerMembers(server);
  state.activeChannel = server.channels?.find((channel) => channel.type === "text") || server.channels?.[0] || null;
  state.messages = state.activeChannel?.type === "text" ? safeMessageList(await db.get(`messages/${server.id}/${state.activeChannel.id}`)) : [];
  render();
}

async function loadServerMembers(server) {
  state.serverMembers = [];
  if (!server || !state.user) return;
  let index = {};
  try {
    await db.set(`serverMembers/${server.id}/${state.user.id}`, true);
    index = await db.get(`serverMembers/${server.id}`) || {};
  } catch { /* The space remains usable if the member index is temporarily unavailable. */ }
  const ids = Object.keys(index).filter((id) => safeKey(id) && index[id] === true).slice(0, 100);
  if (server.ownerId && !ids.includes(server.ownerId)) ids.unshift(server.ownerId);
  if (state.user.id && !ids.includes(state.user.id)) ids.push(state.user.id);
  const profiles = await Promise.all(ids.slice(0, 101).map(async (id) => {
    if (id === state.user.id) return state.user;
    try { return normalizeProfile(await db.get(`profiles/${id}`), id); } catch { return null; }
  }));
  state.serverMembers = profiles.filter(Boolean);
}

async function persistServerUpdate(server, errorMessage = "Couldn't save those space changes.") {
  if (!server || !safeKey(server.id) || server.id !== state.activeServer?.id) return false;
  try { await db.set(`servers/${server.id}`, server); }
  catch { toast(errorMessage, "error"); return false; }
  state.activeServer = server;
  const index = state.servers.findIndex((item) => item.id === server.id);
  if (index >= 0) state.servers[index] = server;
  if (Array.isArray(state.publicServers)) {
    const publicIndex = state.publicServers.findIndex((item) => item.id === server.id);
    if (publicIndex >= 0) state.publicServers[publicIndex] = server;
  }
  return true;
}

async function createServer(form) {
  if (!state.user) return toast("Sign in before starting a space.", "error");
  const data = new FormData(form);
  const name = cleanText(data.get("name"), 48);
  const visibility = safeVisibility(data.get("visibility"));
  if (!name || !visibility) return toast("Enter a name and choose a valid visibility.", "error");
  const id = newId("space-");
  const code = newId("join").toLowerCase();
  const server = {
    id, name, description: cleanText(data.get("description"), 180), visibility,
    ownerId: state.user.id, ownerName: state.user.displayName || state.user.username, icon: "", accent: ACCENTS[Math.floor(Math.random() * ACCENTS.length)],
    createdAt: Date.now(), memberCount: 1, inviteCode: code, tags: [], emojis: [], roles: [], memberRoles: {},
    channels: [{ id: "general", name: "general", type: "text", createdAt: Date.now() }, { id: "voice-general", name: "lounge", type: "voice", createdAt: Date.now() }],
  };
  await Promise.all([
    db.set(`servers/${id}`, server),
    db.set(`memberships/${state.user.id}/${id}`, true),
    db.set(`serverMembers/${id}/${state.user.id}`, true),
    db.set(`invites/${code}`, id),
  ]);
  state.servers.unshift(server);
  state.activeServer = server;
  state.serverMembers = [state.user];
  state.activeChannel = server.channels[0];
  state.area = "space";
  state.modal = null;
  state.messages = [];
  render();
  toast(`${name} is ready for your people.`);
}

async function joinServer(serverId) {
  serverId = safeKey(serverId);
  if (!serverId || !state.user) return toast("That space is not available to join.", "error");
  const server = normalizeServer(await db.get(`servers/${serverId}`), serverId);
  if (!server || server.visibility !== "public") return toast("This space is not available to join.", "error");
  if (!state.servers.some((item) => item.id === serverId)) {
    server.memberCount = Math.min(1_000_000_000, server.memberCount + 1);
    await Promise.all([
      db.set(`memberships/${state.user.id}/${serverId}`, true),
      db.set(`serverMembers/${serverId}/${state.user.id}`, true),
      db.set(`servers/${serverId}`, server),
    ]);
    state.servers.push(server);
  }
  await selectServer(serverId);
  toast(`Welcome to ${server.name}.`);
}

async function joinInvite(code) {
  const input = cleanText(code, 256);
  let clean = input;
  try {
    if (/^https?:\/\//i.test(input)) clean = new URL(input).searchParams.get("invite") || "";
    else if (input.includes("?")) clean = new URL(`https://ucord.invalid/?${input.split("?").at(-1)}`).searchParams.get("invite") || "";
  } catch { clean = ""; }
  clean = clean.toLowerCase();
  if (!/^join(?:[a-f0-9]{14}|[a-f0-9]{32})$/.test(clean) || !state.user) return toast("That invite link doesn't look right.", "error");
  const serverId = safeKey(await db.get(`invites/${clean}`));
  if (!serverId) return toast("That invite link doesn't look right.", "error");
  const server = normalizeServer(await db.get(`servers/${serverId}`), serverId);
  if (!server) return toast("That space could not be found.", "error");
  if (!state.servers.some((item) => item.id === server.id)) {
    await Promise.all([
      db.set(`memberships/${state.user.id}/${server.id}`, true),
      db.set(`serverMembers/${server.id}/${state.user.id}`, true),
      db.set(`servers/${server.id}`, { ...server, memberCount: Math.min(1_000_000_000, server.memberCount + 1) }),
    ]);
    server.memberCount = Math.min(1_000_000_000, server.memberCount + 1);
    state.servers.push(server);
  }
  state.modal = null;
  await selectServer(server.id);
  toast(`You're in ${server.name}.`);
}

async function createChannel(form) {
  const type = form.dataset.channelType;
  if (!hasServerPermission(state.activeServer, state.user?.id, "manageChannels")) return toast("You do not have permission to manage channels.", "error");
  if (!["text", "voice"].includes(type)) return toast("Choose a valid channel type.", "error");
  const name = cleanText(new FormData(form).get("name"), 32).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-|-$/g, "");
  if (!name) return toast("Enter a valid channel name.", "error");
  const channels = state.activeServer.channels || [];
  const count = channels.filter((c) => c.type === type).length;
  const max = type === "voice" ? 10 : 20;
  if (channels.length >= 30) return toast("This space has reached its 30 channel limit.", "error");
  if (count >= max) return toast(`This space has reached its ${max} ${type} channel limit.`, "error");
  if (channels.some((channel) => channel.type === type && channel.name === name)) return toast("That channel name is already in use.", "error");
  const channel = { id: newId(type === "voice" ? "voice-" : "channel-"), name, type, createdAt: Date.now() };
  const next = JSON.parse(JSON.stringify(state.activeServer));
  next.channels = [...channels, channel];
  if (!await persistServerUpdate(next, "Couldn't create the channel. Please try again.")) return;
  state.activeChannel = channel;
  state.messages = [];
  state.modal = null;
  render();
  toast(`${type === "voice" ? "Voice room" : "Channel"} created.`);
}

async function sendMessage(form) {
  const body = cleanText(new FormData(form).get("body"), 1800);
  if (!body) return;
  if (!state.user) return;
  const draftKey = form.dataset.composerKey || composerKey(form.dataset.kind);
  const message = { id: newId("msg-"), authorId: state.user.id, author: state.user.displayName || state.user.username, avatar: state.user.avatar || "", body, at: Date.now() };
  if (form.dataset.kind === "dm" && state.currentDM && safeKey(state.currentDM.id)) {
    const key = dmKey(state.user.id, state.currentDM.id);
    await db.set(`dms/${key}/${message.id}`, message);
    await db.set(`dmIndex/${state.user.id}/${state.currentDM.id}`, true);
    await db.set(`dmIndex/${state.currentDM.id}/${state.user.id}`, true);
    state.dmMessages.push(message);
  } else if (state.activeServer && state.activeChannel) {
    await db.set(`messages/${state.activeServer.id}/${state.activeChannel.id}/${message.id}`, message);
    state.messages.push(message);
  }
  delete state.composerDrafts[draftKey];
  render();
  document.querySelector('#message-form input[name="body"]')?.focus();
}

async function uploadEmoji(form) {
  const data = new FormData(form);
  const file = data.get("emojiFile");
  let name = String(data.get("emojiName") || "").trim().toLowerCase();
  if (!file || !file.size || !state.activeServer) return;
  if (!hasServerPermission(state.activeServer, state.user.id, "manageEmojis")) return toast("You do not have permission to add custom emoji.", "error");
  if (!/^[a-z0-9_]{2,24}$/.test(name)) return toast("Use 2–24 letters, numbers, or underscores for the name.", "error");
  if ((state.activeServer.emojis || []).length >= 50) return toast("This space has reached its 50 custom emoji limit.", "error");
  if (file.size > 160 * 1024) return toast("That image is over 160 KB. Try a smaller one.", "error");
  if (!["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type)) return toast("Choose a PNG, JPG, GIF, or WebP image.", "error");
  if ((state.activeServer.emojis || []).some((emoji) => emoji.name === name)) return toast("That emoji name is already in use.", "error");
  let src;
  try { src = await fileAsDataUrl(file, 160 * 1024); }
  catch { return toast("That image could not be safely decoded. Try another image.", "error"); }
  if (!safeImageSrc(src)) return toast("That image could not be safely decoded. Try another image.", "error");
  const next = JSON.parse(JSON.stringify(state.activeServer));
  next.emojis = [...(next.emojis || []), { name, src, addedBy: state.user.id, createdAt: Date.now() }];
  if (!await persistServerUpdate(next, "Couldn't add the emoji. Please try again.")) return;
  state.modal = { type: "emojis" };
  render();
  toast(`:${name}: is ready for everyone in the space.`);
}

async function fileAsDataUrl(file, maxBytes) {
  if (!file || !["image/png", "image/jpeg", "image/gif", "image/webp"].includes(file.type) || file.size < 1 || file.size > maxBytes) throw new TypeError("Unsupported image.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let width = 0;
  let height = 0;
  let actualType = "";
  if (bytes.length >= 24 && bytes[0] === 0x89 && String.fromCharCode(...bytes.slice(1, 4)) === "PNG" && String.fromCharCode(...bytes.slice(12, 16)) === "IHDR") {
    actualType = "image/png"; width = view.getUint32(16); height = view.getUint32(20);
  } else if (bytes.length >= 10 && ["GIF87a", "GIF89a"].includes(String.fromCharCode(...bytes.slice(0, 6))) ) {
    actualType = "image/gif"; width = view.getUint16(6, true); height = view.getUint16(8, true);
  } else if (bytes.length >= 30 && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") {
    actualType = "image/webp";
    const kind = String.fromCharCode(...bytes.slice(12, 16));
    if (kind === "VP8X") { width = 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16); height = 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16); }
    else if (kind === "VP8L" && bytes[20] === 0x2f) { width = 1 + (((bytes[22] & 0x3f) << 8) | bytes[21]); height = 1 + (((bytes[24] & 0x0f) << 10) | (bytes[23] << 2) | ((bytes[22] & 0xc0) >> 6)); }
    else if (kind === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) { width = view.getUint16(26, true) & 0x3fff; height = view.getUint16(28, true) & 0x3fff; }
  } else if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    actualType = "image/jpeg";
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) break;
      const marker = bytes[offset + 1];
      const length = view.getUint16(offset + 2);
      if (length < 2 || offset + 2 + length > bytes.length) break;
      if (length >= 8 && [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        height = view.getUint16(offset + 5); width = view.getUint16(offset + 7); break;
      }
      offset += 2 + length;
    }
  }
  if (actualType !== file.type || width < 1 || height < 1 || width > 4096 || height > 4096 || width * height > 16_777_216) throw new TypeError("Invalid or oversized image.");
  const bitmap = await decodeLocalImage(file);
  try {
    for (const maxSide of [1024, 768, 512, 384, 256]) {
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d", { alpha: true });
      if (!context) throw new Error("Canvas unavailable.");
      context.drawImage(bitmap.source, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.68, 0.54]) {
        const encoded = canvas.toDataURL("image/webp", quality);
        if (encoded.length <= 350_000 && safeImageSrc(encoded)) return encoded;
      }
    }
    throw new Error("Could not encode a compact safe image.");
  } finally { bitmap.close(); }
}

async function decodeLocalImage(file) {
  if (typeof createImageBitmap === "function") {
    const image = await createImageBitmap(file);
    return { width: image.width, height: image.height, source: image, close: () => image.close() };
  }
  const url = URL.createObjectURL(file);
  const image = new Image();
  image.src = url;
  try {
    if (typeof image.decode === "function") await image.decode();
    else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; });
    return { width: image.naturalWidth, height: image.naturalHeight, source: image, close: () => URL.revokeObjectURL(url) };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

async function registerAccount(form) {
  const data = new FormData(form);
  const username = String(data.get("username") || "").trim();
  const password = String(data.get("password") || "");
  const key = usernameKey(username);
  const error = document.querySelector("#auth-error");
  if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
    error.textContent = "Use 3–20 letters, numbers, or underscores for your username.";
    return;
  }
  if (password.length < 6 || password.length > 256) { error.textContent = "Use a password between 6 and 256 characters."; return; }
  error.textContent = "";
  const existing = await db.get(`accounts/${key}`);
  if (existing) { error.textContent = "That username is already taken. Try another."; return; }
  const credentials = await derivePassword(password);
  const guest = state.user?.guest ? state.user : null;
  if (guest && state.voiceJoined) await leaveVoiceRoom();
  const profile = guest
    ? { ...profileDefaults(username, key), ...guest, id: key, username, guest: false, displayName: guest.displayName || username }
    : profileDefaults(username, key);
  await Promise.all([
    db.set(`accounts/${key}`, { ...credentials, username, id: key, createdAt: Date.now() }),
    db.set(`profiles/${key}`, profile),
    db.set(`directory/${key}`, key),
  ]);
  if (guest) await migrateGuest(guest, profile);
  await enterApp(profile);
  toast(`Welcome to ucord, ${username}.`);
}

async function loginAccount(form) {
  const data = new FormData(form);
  const username = String(data.get("username") || "").trim();
  const password = String(data.get("password") || "");
  const key = usernameKey(username);
  const error = document.querySelector("#auth-error");
  if (!safeUsername(username) || password.length < 1 || password.length > 256) { error.textContent = "Enter a valid username and password."; return; }
  const account = await db.get(`accounts/${key}`);
  if (!account) { error.textContent = "We couldn't find that username. Check it and try again."; return; }
  if (typeof account.salt !== "string" || typeof account.verifier !== "string" || !/^[a-f\d]{64}$/i.test(account.verifier)) { error.textContent = "That account record is invalid."; return; }
  const result = await derivePassword(password, account.salt, account.iterations);
  if (result.verifier !== account.verifier) { error.textContent = "That password doesn't match this username."; return; }
  const profile = normalizeProfile(await db.get(`profiles/${key}`), key) || profileDefaults(cleanText(account.username || username, 20), key);
  await enterApp(profile);
  toast(`Welcome back, ${profile.displayName || username}.`);
}

async function startGuest(form) {
  const username = cleanText(new FormData(form).get("username"), 24);
  const error = document.querySelector("#guest-error");
  if (username.length < 2) { if (error) error.textContent = "Choose a display name with at least 2 characters."; return; }
  if (username.length > 24) { if (error) error.textContent = "Display names can be up to 24 characters."; return; }
  const key = newId("guest-");
  const profile = profileDefaults(username, key, true);
  try {
    await db.set(`profiles/${key}`, profile);
    state.guestPrompt = false;
    await enterApp(profile);
    toast(`Welcome to ucord, ${username}.`);
  } catch (error) {
    console.error("Could not start a temporary ucord session.", error);
    toast("ucord couldn't start a guest session. Please try again.", "error");
  }
}

async function loadDiscover() {
  const data = await db.get("servers") || {};
  state.publicServers = Object.entries(data).slice(0, 500).map(([id, value]) => normalizeServer(value, id)).filter((server) => server?.visibility === "public").sort((a, b) => b.createdAt - a.createdAt);
}

async function findPerson(form) {
  const input = cleanText(new FormData(form).get("username"), 20);
  if (!safeUsername(input)) return toast("Use a username with 3–20 letters, numbers, or underscores.", "error");
  const username = usernameKey(input);
  const id = await db.get(`directory/${username}`);
  const profileId = safeKey(id);
  if (!profileId) return toast("We couldn't find that username.", "error");
  const profile = normalizeProfile(await db.get(`profiles/${profileId}`), profileId);
  if (!profile || profile.id === state.user.id) return toast("Try another username to find someone.", "error");
  state.currentDM = profile;
  state.area = "messages";
  state.activeServer = null;
  state.activeChannel = null;
  const key = dmKey(state.user.id, profile.id);
  state.dmMessages = safeMessageList(await db.get(`dms/${key}`));
  render();
}

async function startDM(id) {
  id = safeKey(id);
  if (!id || !state.user) return toast("That profile could not be found.", "error");
  if (id === state.user.id) { state.modal = { type: "profile", profile: state.user }; render(); return; }
  const profile = normalizeProfile(await db.get(`profiles/${id}`), id);
  if (!profile) return toast("That profile could not be found.", "error");
  state.modal = null;
  state.currentDM = profile;
  state.area = "messages";
  state.activeServer = null;
  const key = dmKey(state.user.id, profile.id);
  state.dmMessages = safeMessageList(await db.get(`dms/${key}`));
  render();
}

async function migrateGuest(guest, profile) {
  const guestId = safeKey(guest?.id);
  if (!guestId || !safeKey(profile?.id)) return;
  const membershipsData = await db.get(`memberships/${guestId}`);
  const memberships = membershipsData && typeof membershipsData === "object" && !Array.isArray(membershipsData) ? membershipsData : {};
  const serverIds = Object.keys(memberships).filter((id) => safeKey(id) && memberships[id] === true).slice(0, 100);
  const servers = await Promise.all(serverIds.map(async (id) => normalizeServer(await db.get(`servers/${id}`), id)));
  const moves = [];
  for (const server of servers.filter(Boolean)) {
    const owner = server.ownerId === guestId;
    let changed = false;
    if (owner) {
      server.ownerId = profile.id;
      server.ownerName = profile.displayName || profile.username;
      changed = true;
    }
    if (server.memberRoles?.[guestId]) {
      server.memberRoles[profile.id] = server.memberRoles[guestId];
      delete server.memberRoles[guestId];
      changed = true;
    }
    moves.push(db.set(`memberships/${profile.id}/${server.id}`, true));
    moves.push(db.delete(`memberships/${guestId}/${server.id}`));
    moves.push(db.set(`serverMembers/${server.id}/${profile.id}`, true));
    moves.push(db.delete(`serverMembers/${server.id}/${guestId}`));
    if (changed) moves.push(db.set(`servers/${server.id}`, server));
  }
  const dmIndexData = await db.get(`dmIndex/${guestId}`);
  const dmIndex = dmIndexData && typeof dmIndexData === "object" && !Array.isArray(dmIndexData) ? dmIndexData : {};
  for (const otherId of Object.keys(dmIndex).filter((id) => safeKey(id)).slice(0, 100)) {
    const oldKey = dmKey(guestId, otherId);
    const nextKey = dmKey(profile.id, otherId);
    const [oldMessages, nextMessages] = await Promise.all([db.get(`dms/${oldKey}`), db.get(`dms/${nextKey}`)]);
    const oldMessageRecord = oldMessages && typeof oldMessages === "object" && !Array.isArray(oldMessages) ? oldMessages : {};
    const nextMessageRecord = nextMessages && typeof nextMessages === "object" && !Array.isArray(nextMessages)
      ? Object.fromEntries(Object.entries(nextMessages).slice(-250).filter(([messageId]) => safeKey(messageId))) : {};
    const carried = Object.fromEntries(Object.entries(oldMessageRecord).slice(-250).filter(([messageId]) => safeKey(messageId)).map(([messageId, message]) => [messageId, message && typeof message === "object" && message.authorId === guestId
      ? { ...message, authorId: profile.id, author: profile.displayName || profile.username, avatar: profile.avatar || "" }
      : message]));
    moves.push(db.set(`dms/${nextKey}`, { ...nextMessageRecord, ...carried }));
    moves.push(db.set(`dmIndex/${profile.id}/${otherId}`, true));
    moves.push(db.set(`dmIndex/${otherId}/${profile.id}`, true));
    moves.push(db.delete(`dms/${oldKey}`));
    moves.push(db.delete(`dmIndex/${guestId}/${otherId}`));
  }
  moves.push(db.delete(`profiles/${guestId}`));
  await Promise.all(moves);
}

function permissionsFromForm(form, existing = {}) {
  const selected = new Set(new FormData(form).getAll("permission"));
  const next = Object.fromEntries(ROLE_PERMISSIONS.map((permission) => [permission, selected.has(permission)]));
  if (state.activeServer?.ownerId !== state.user?.id) next.manageRoles = existing.manageRoles === true;
  return next;
}

async function createRole(form) {
  const server = state.activeServer;
  if (!hasServerPermission(server, state.user?.id, "manageRoles")) return toast("You do not have permission to manage roles.", "error");
  const name = cleanText(new FormData(form).get("name"), 32);
  if (!name) return toast("Enter a role name.", "error");
  if ((server.roles || []).length >= 20) return toast("This space has reached its 20 role limit.", "error");
  if ((server.roles || []).some((role) => role.name.toLowerCase() === name.toLowerCase())) return toast("That role name is already in use.", "error");
  const data = new FormData(form);
  const next = JSON.parse(JSON.stringify(server));
  next.roles = [...(next.roles || []), { id: newId("role-"), name, color: safeAccent(data.get("color")), permissions: permissionsFromForm(form) }];
  if (!await persistServerUpdate(next, "Couldn't add the role. Please try again.")) return;
  state.modal = { type: "server-settings", tab: "roles" };
  render();
  toast(`${name} role added.`);
}

async function saveRole(form) {
  const server = state.activeServer;
  if (!hasServerPermission(server, state.user?.id, "manageRoles")) return toast("You do not have permission to manage roles.", "error");
  const roleId = safeKey(form.dataset.roleId);
  const index = server?.roles?.findIndex((role) => role.id === roleId) ?? -1;
  if (index < 0) return toast("That role could not be found.", "error");
  const name = cleanText(new FormData(form).get("name"), 32);
  if (!name) return toast("Enter a role name.", "error");
  if (server.roles.some((role) => role.id !== roleId && role.name.toLowerCase() === name.toLowerCase())) return toast("That role name is already in use.", "error");
  const data = new FormData(form);
  const next = JSON.parse(JSON.stringify(server));
  next.roles[index] = { ...next.roles[index], name, color: safeAccent(data.get("color")), permissions: permissionsFromForm(form, next.roles[index].permissions) };
  if (!await persistServerUpdate(next, "Couldn't save the role. Please try again.")) return;
  state.modal = { type: "server-settings", tab: "roles" };
  render();
  toast(`${name} role saved.`);
}

async function saveMemberRoles(form) {
  const server = state.activeServer;
  if (!hasServerPermission(server, state.user?.id, "manageRoles")) return toast("You do not have permission to assign roles.", "error");
  const memberId = safeKey(form.dataset.memberId);
  if (!memberId || !state.serverMembers.some((member) => member.id === memberId)) return toast("That member could not be found.", "error");
  const selected = new Set(new FormData(form).getAll("roleId").filter((id) => safeKey(id)));
  const current = server.memberRoles?.[memberId] || [];
  const assigned = (server.roles || []).filter((role) => selected.has(role.id) && (state.user.id === server.ownerId || !role.permissions?.manageRoles || current.includes(role.id))).map((role) => role.id);
  const next = JSON.parse(JSON.stringify(server));
  next.memberRoles ||= {};
  if (assigned.length) next.memberRoles[memberId] = assigned;
  else delete next.memberRoles[memberId];
  if (!await persistServerUpdate(next, "Couldn't save the member's roles. Please try again.")) return;
  state.modal = { type: "server-settings", tab: "roles" };
  render();
  toast("Member roles updated.");
}

async function deleteRole(roleId) {
  const server = state.activeServer;
  if (!hasServerPermission(server, state.user?.id, "manageRoles")) return toast("You do not have permission to manage roles.", "error");
  roleId = safeKey(roleId);
  const role = server?.roles?.find((item) => item.id === roleId);
  if (!role) return toast("That role could not be found.", "error");
  if (state.user.id !== server.ownerId && role.permissions?.manageRoles) return toast("Only the space owner can remove a role that manages roles.", "error");
  if (!confirm(`Delete the ${role.name} role? Members will lose it.`)) return;
  const next = JSON.parse(JSON.stringify(server));
  next.roles = next.roles.filter((item) => item.id !== roleId);
  for (const [memberId, roles] of Object.entries(next.memberRoles || {})) {
    const remaining = roles.filter((id) => id !== roleId);
    if (remaining.length) next.memberRoles[memberId] = remaining;
    else delete next.memberRoles[memberId];
  }
  if (!await persistServerUpdate(next, "Couldn't delete the role. Please try again.")) return;
  state.modal = { type: "server-settings", tab: "roles" };
  render();
  toast(`${role.name} role deleted.`);
}

async function saveServerSettings(form, kind) {
  const server = state.activeServer;
  if (!server || server.ownerId !== state.user?.id || !safeKey(server.id)) return toast("Only the space owner can change settings.", "error");
  const data = new FormData(form);
  const next = JSON.parse(JSON.stringify(server));
  if (kind === "overview") {
    const name = cleanText(data.get("name"), 48);
    if (!name) return toast("Enter a valid space name.", "error");
    next.name = name;
    next.description = cleanText(data.get("description"), 180);
    const accent = data.get("accent");
    if (ACCENTS.includes(accent)) next.accent = accent;
    const file = data.get("serverIcon");
    if (file?.size) {
      if (file.size > 240 * 1024) return toast("That icon is over 240 KB. Choose a smaller one.", "error");
      try { next.icon = await fileAsDataUrl(file, 240 * 1024); }
      catch { return toast("That icon could not be safely decoded. Try another image.", "error"); }
    }
  } else {
    const visibility = safeVisibility(data.get("visibility"));
    if (!visibility) return toast("Choose a valid visibility.", "error");
    next.visibility = visibility;
    next.tags = safeTags(cleanText(data.get("tags"), 500));
  }
  if (!await persistServerUpdate(next, "Couldn't save those space settings. Please try again.")) return;
  state.modal = { type: "server-settings", tab: kind };
  render();
  toast(kind === "visibility" ? "Visibility and tags updated." : "Space details saved.");
}

async function saveProfile(form) {
  if (!state.user || !safeKey(state.user.id)) return;
  const data = new FormData(form);
  const displayName = cleanText(data.get("displayName"), 32);
  if (!displayName) return toast("Choose a display name.", "error");
  const next = { ...state.user, displayName, bio: cleanText(data.get("bio"), 180), tags: safeTags(cleanText(data.get("profileTags"), 500)) };
  const file = data.get("avatarFile");
  if (file?.size) {
    if (file.size > 240 * 1024) return toast("That picture is over 240 KB. Choose a smaller one.", "error");
    try { next.avatar = await fileAsDataUrl(file, 240 * 1024); }
    catch { return toast("That picture could not be safely decoded. Try another image.", "error"); }
  }
  try { await db.set(`profiles/${next.id}`, next); }
  catch { return toast("Couldn't save your profile. Please try again.", "error"); }
  state.user = next;
  saveSession();
  state.modal = { type: "customize", tab: "profile" };
  render();
  toast("Your profile looks like you now.");
}

async function saveAppearance(form) {
  if (!state.user || !safeKey(state.user.id)) return;
  const data = new FormData(form);
  const theme = data.get("theme");
  const accent = data.get("accent");
  const next = { ...state.user };
  next.theme = ["midnight", "dusk", "moss"].includes(theme) ? theme : "midnight";
  if (ACCENTS.includes(accent)) next.accent = accent;
  next.compact = data.get("compact") === "on";
  try { await db.set(`profiles/${next.id}`, next); }
  catch { return toast("Couldn't save your appearance. Please try again.", "error"); }
  state.user = next;
  saveSession();
  state.modal = { type: "customize", tab: "appearance" };
  render();
  toast("Your ucord, your mood.");
}

app.addEventListener("click", async (event) => {
  const closeServerMenu = state.modal?.type === "server-menu" && !event.target.closest(".server-options-menu") && !event.target.closest('[data-action="server-menu"]');
  if (closeServerMenu) state.modal = null;
  const stop = event.target.closest("[data-stop]");
  const control = event.target.closest("[data-action]");
  if (!control) { if (closeServerMenu) render(); return; }
  const action = control.dataset.action;
  if (action === "open-server-settings" && state.activeServer?.ownerId !== state.user?.id) {
    toast("Only the space owner can change space settings.", "error");
    return;
  }
  if (action === "create-channel" && !hasServerPermission(state.activeServer, state.user?.id, "manageChannels")) {
    toast("You do not have permission to manage channels.", "error");
    return;
  }
  if ((action === "open-server-roles" || (action === "settings-tab" && control.dataset.tab === "roles")) && !hasServerPermission(state.activeServer, state.user?.id, "manageRoles")) {
    toast("You do not have permission to manage roles.", "error");
    return;
  }
  if (stop && control === stop && action !== "close-modal") return;
  if (action === "top" || action === "back-home") { setRoute("landing"); return; }
  if (action === "auth-login") { state.authMode = "login"; state.guestPrompt = false; setRoute("auth"); return; }
  if (action === "auth-register") { state.authMode = "register"; state.guestPrompt = false; setRoute("auth"); return; }
  if (action === "switch-auth") { state.authMode = state.authMode === "login" ? "register" : "login"; render(); return; }
  if (action === "guest-start") { state.route = "landing"; state.modal = null; state.guestPrompt = true; render(); setTimeout(() => document.querySelector('#guest-form input[name="username"]')?.focus(), 20); return; }
  if (action === "guest-cancel") { state.guestPrompt = false; render(); return; }
  if (action === "close-modal") { if (control === event.target || control.classList.contains("modal-close")) { state.modal = null; render(); } return; }
  if (action === "open-create-server") { state.modal = { type: "create-server" }; render(); return; }
  if (action === "select-server") { await selectServer(control.dataset.id); state.sidebarOpen = true; render(); return; }
  if (action === "toggle-sidebar") { state.sidebarOpen = !state.sidebarOpen; render(); return; }
  if (action === "go-home") { if (state.voiceJoined) await leaveVoiceRoom(); state.sidebarOpen = false; state.activeServer = null; state.activeChannel = null; state.area = "home"; state.currentDM = null; state.modal = null; render(); return; }
  if (action === "set-area-discover") { if (state.voiceJoined) await leaveVoiceRoom(); state.sidebarOpen = false; state.activeServer = null; state.activeChannel = null; state.currentDM = null; state.area = "discover"; state.modal = null; await loadDiscover(); render(); return; }
  if (action === "set-area-messages") { if (state.voiceJoined) await leaveVoiceRoom(); state.sidebarOpen = false; state.activeServer = null; state.activeChannel = null; state.currentDM = null; state.area = "messages"; state.modal = null; render(); return; }
  if (action === "filter-discover") { state.filter = ["All", "Creative", "Gaming", "Study", "Friends"].includes(control.dataset.filter) ? control.dataset.filter : "All"; render(); return; }
  if (action === "open-invite") { state.modal = { type: "invite" }; render(); return; }
  if (action === "join-server") { await joinServer(control.dataset.id); return; }
  if (action === "server-menu") { state.modal = state.modal?.type === "server-menu" ? null : { type: "server-menu" }; render(); return; }
  if (action === "open-server-settings") { state.modal = { type: "server-settings", tab: "overview" }; render(); return; }
  if (action === "settings-tab") { state.modal = { type: "server-settings", tab: ["overview", "visibility", "emoji", "roles"].includes(control.dataset.tab) ? control.dataset.tab : "overview" }; render(); return; }
  if (action === "open-server-roles") { state.modal = { type: "server-settings", tab: "roles" }; render(); return; }
  if (action === "create-channel") { const type = control.dataset.type || "text"; state.modal = { type: "channel", channelType: type }; render(); return; }
  if (action === "select-channel") {
    const nextChannel = state.activeServer?.channels?.find((channel) => channel.id === control.dataset.id) || null;
    if (state.voiceJoined && state.activeChannel?.id !== nextChannel?.id) await leaveVoiceRoom();
    state.activeChannel = nextChannel;
    state.modal = null;
    state.sidebarOpen = false;
    state.messages = state.activeChannel?.type === "text" ? safeMessageList(await db.get(`messages/${state.activeServer.id}/${state.activeChannel.id}`)) : [];
    render(); return;
  }
  if (action === "delete-channel") {
    event.stopPropagation();
    if (!hasServerPermission(state.activeServer, state.user.id, "manageChannels") || control.dataset.id === "general") return;
    const channel = state.activeServer.channels.find((c) => c.id === control.dataset.id);
    if (channel && confirm(`Delete #${channel.name}? Its messages will no longer appear.`)) {
      if (state.voiceJoined && state.activeChannel?.id === channel.id) await leaveVoiceRoom();
      const next = JSON.parse(JSON.stringify(state.activeServer));
      next.channels = next.channels.filter((c) => c.id !== channel.id);
      if (!await persistServerUpdate(next, "Couldn't delete the channel. Please try again.")) return;
      if (state.activeChannel?.id === channel.id) {
        state.activeChannel = next.channels.find((c) => c.type === "text") || next.channels[0] || null;
        state.messages = state.activeChannel?.type === "text"
          ? safeMessageList(await db.get(`messages/${next.id}/${state.activeChannel.id}`))
          : [];
      }
      render(); toast("Channel removed.");
    }
    return;
  }
  if (action === "open-emojis") { state.modal = { type: "emojis" }; render(); return; }
  if (action === "delete-role") { await deleteRole(control.dataset.id); return; }
  if (action === "delete-emoji") {
    if (!hasServerPermission(state.activeServer, state.user.id, "manageEmojis")) return toast("You do not have permission to remove custom emoji.", "error");
    const next = JSON.parse(JSON.stringify(state.activeServer));
    next.emojis = (next.emojis || []).filter((emoji) => emoji.name !== control.dataset.name);
    if (!await persistServerUpdate(next, "Couldn't remove the emoji. Please try again.")) return;
    state.modal = { type: "emojis" }; render(); toast("Custom emoji removed."); return;
  }
  if (action === "composer-emoji") {
    const form = control.closest("form");
    const field = form?.querySelector('input[name="body"]');
    const key = form?.dataset.composerKey || composerKey(form?.dataset.kind || "channel");
    if (field) state.composerDrafts[key] = { value: field.value, start: field.selectionStart, end: field.selectionEnd };
    state.modal = { type: "emoji-picker" };
    render();
    return;
  }
  if (action === "insert-emoji") {
    const field = document.querySelector('#message-form input[name="body"]');
    const form = field?.form;
    const key = form?.dataset.composerKey || composerKey(form?.dataset.kind || "channel");
    const draft = state.composerDrafts[key] || { value: field?.value || "", start: field?.value.length || 0, end: field?.value.length || 0 };
    const value = field?.value ?? draft.value;
    const start = draft.start ?? field?.selectionStart ?? value.length;
    const end = draft.end ?? field?.selectionEnd ?? value.length;
    const insertion = String(control.dataset.value || "");
    if (value.length - (end - start) + insertion.length > 1800) return toast("That message is at the 1,800 character limit.", "error");
    const next = `${value.slice(0, start)}${insertion}${value.slice(end)}`;
    const caret = start + insertion.length;
    state.composerDrafts[key] = { value: next, start: caret, end: caret };
    state.modal = null;
    render();
    const refocus = document.querySelector('#message-form input[name="body"]');
    if (refocus) { refocus.focus(); refocus.setSelectionRange(caret, caret); }
    return;
  }
  if (action === "open-customize") { state.modal = { type: "customize", tab: "profile" }; render(); return; }
  if (action === "customize-tab") { state.modal = { type: "customize", tab: ["profile", "appearance"].includes(control.dataset.tab) ? control.dataset.tab : "profile" }; render(); return; }
  if (action === "view-self") { state.modal = { type: "profile", profile: state.user }; render(); return; }
  if (action === "view-profile") { const id = safeKey(control.dataset.id); const profile = id ? normalizeProfile(await db.get(`profiles/${id}`), id) : null; if (profile) { state.modal = { type: "profile", profile }; render(); } return; }
  if (action === "start-dm") { await startDM(control.dataset.id); return; }
  if (action === "account-menu") { state.modal = { type: "account" }; render(); return; }
  if (action === "sign-out") { if (state.voiceJoined) await leaveVoiceRoom(); state.user = null; state.servers = []; state.activeServer = null; state.activeChannel = null; state.composerDrafts = {}; state.modal = null; saveSession(); setRoute("landing"); return; }
  if (action === "toggle-voice") { if (state.voiceJoined) await leaveVoiceRoom(); else return joinVoiceRoom(); render(); return; }
  if (action === "toggle-mute") { state.voiceMuted = !state.voiceMuted; for (const track of state.voiceStream?.getAudioTracks() || []) track.enabled = !state.voiceMuted; const host = document.querySelector("#voice-members"); if (host) host.innerHTML = voiceMemberMarkup(state.voiceMembers); return; }
  if (action === "copy-invite") {
    const input = document.querySelector("#invite-link");
    try { await navigator.clipboard.writeText(input.value); toast("Invite link copied."); }
    catch { input.select(); document.execCommand("copy"); toast("Invite link copied."); }
    return;
  }
});

app.addEventListener("submit", async (event) => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "auth-form") {
    try { return await (form.dataset.mode === "register" ? registerAccount(form) : loginAccount(form)); }
    catch (error) {
      console.error("ucord account action failed.", error);
      const message = form.dataset.mode === "register" ? "We couldn't create the account right now. Please try again." : "We couldn't log you in right now. Please try again.";
      const feedback = document.querySelector("#auth-error");
      if (feedback) feedback.textContent = message;
    }
  }
  if (form.id === "guest-form") return startGuest(form);
  if (form.id === "create-server-form") return createServer(form);
  if (form.id === "create-channel-form") return createChannel(form);
  if (form.id === "message-form") return sendMessage(form);
  if (form.id === "emoji-upload-form") return uploadEmoji(form);
  if (form.id === "server-overview-form") return saveServerSettings(form, "overview");
  if (form.id === "server-visibility-form") return saveServerSettings(form, "visibility");
  if (form.id === "create-role-form") return createRole(form);
  if (form.matches(".role-editor")) return saveRole(form);
  if (form.matches(".member-role-row")) return saveMemberRoles(form);
  if (form.id === "profile-form") return saveProfile(form);
  if (form.id === "appearance-form") return saveAppearance(form);
  if (form.id === "join-code-form") return joinInvite(String(new FormData(form).get("code") || ""));
  if (form.id === "find-person-form") return findPerson(form);
});

app.addEventListener("input", async (event) => {
  if (event.target.matches('#message-form input[name="body"]')) {
    const key = event.target.form?.dataset.composerKey;
    if (key) state.composerDrafts[key] = { value: event.target.value.slice(0, 1800), start: event.target.selectionStart, end: event.target.selectionEnd };
  }
  if (event.target.id === "global-search") {
    state.homeSearch = cleanText(event.target.value, 100);
    const list = document.querySelector(".sidebar-space-list");
    if (list) list.innerHTML = homeSidebarSpaces();
  }
  if (event.target.id === "discover-search") {
    state.discoverSearch = cleanText(event.target.value, 100);
    const grid = document.querySelector("#discover-grid");
    if (grid) grid.innerHTML = renderDiscoverGrid();
  }
});

async function boot() {
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem("ucord:session") || "null"); } catch { saved = null; }
  const invite = new URLSearchParams(location.search).get("invite");
  const savedProfile = normalizeProfile(saved);
  if (savedProfile) {
    state.user = savedProfile;
    state.route = "app";
    state.area = "home";
    const current = normalizeProfile(await db.get(`profiles/${savedProfile.id}`), savedProfile.id);
    if (current) state.user = current;
    await loadServers();
    if (invite) {
      state.pendingInvite = "";
      await joinInvite(invite);
      if (!state.activeServer) render();
      return;
    }
    render();
    return;
  }
  render();
}

boot();
