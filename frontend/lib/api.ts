import axios from "axios";

const BASE = "/api";

function authHeader() {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("zhweb_admin_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// ──────────────── Check-in (public) ────────────────

export async function getBatchInfo(uuid: string) {
  const res = await axios.get(`${BASE}/check-in/${uuid}`);
  return res.data;
}

export async function submitGuests(uuid: string, payload: { guests: GuestPayload[] }) {
  const res = await axios.post(`${BASE}/check-in/${uuid}/submit`, payload);
  return res.data;
}

export async function submitGuestsDirect(payload: { guests: GuestPayload[] }) {
  const res = await axios.post(`${BASE}/check-in/direct`, payload);
  return res.data;
}

// ──────────────── Admin ────────────────

export async function adminLogin(username: string, password: string) {
  const res = await axios.post(`${BASE}/admin/login`, { username, password });
  return res.data as { access_token: string; token_type: string };
}

export async function listBatches() {
  const res = await axios.get(`${BASE}/admin/batches`, { headers: authHeader() });
  return res.data as BatchResponse[];
}

export async function createBatch(data: {
  title: string;
  room_number?: string;
  expires_hours: number;
}) {
  const res = await axios.post(`${BASE}/admin/batches`, data, { headers: authHeader() });
  return res.data as BatchResponse;
}

export async function closeBatch(id: string) {
  const res = await axios.put(`${BASE}/admin/batches/${id}/close`, {}, { headers: authHeader() });
  return res.data;
}

export async function listBatchGuests(id: string) {
  const res = await axios.get(`${BASE}/admin/batches/${id}/guests`, { headers: authHeader() });
  return res.data as GuestResponse[];
}

export function getExportUrl(id: string) {
  return `${BASE}/admin/batches/${id}/export`;
}

export async function getExportCsv(id: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("zhweb_admin_token") : "";
  const res = await axios.get(getExportUrl(id), {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "blob",
  });
  return res;
}

export async function listAllGuests() {
  const res = await axios.get(`${BASE}/admin/guests/all`, { headers: authHeader() });
  return res.data as GuestRow[];
}

export async function exportAllGuests() {
  const token = typeof window !== "undefined" ? localStorage.getItem("zhweb_admin_token") : "";
  const res = await axios.get(`${BASE}/admin/export/all`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "blob",
  });
  return res;
}

export async function deleteGuest(id: string) {
  const res = await axios.delete(`${BASE}/admin/guests/${id}`, { headers: authHeader() });
  return res.data;
}

export async function deleteBatch(batchId: string) {
  const res = await axios.delete(`${BASE}/admin/batches/${batchId}/all`, { headers: authHeader() });
  return res.data;
}

export async function exportAllPhotos() {
  const token = typeof window !== "undefined" ? localStorage.getItem("zhweb_admin_token") : "";
  const res = await axios.get(`${BASE}/admin/export/photos`, {
    headers: { Authorization: `Bearer ${token}` },
    responseType: "blob",
  });
  return res;
}

export interface GuestRow {
  id: string;
  batch_id: string;
  batch_title: string;
  room_number: string | null;
  submitted_at: string;
  // required fields
  name: string;
  phone: string | null;
  address: string;
  photos: string[];          // list of "uploads/{guest_id}/1.jpg" paths
  // optional fields
  arrival_date: string | null;
  departure_date: string | null;
  occupation: string | null;
  age: number | null;
  gender: "M" | "F" | null;
  nationality: string | null;
  passport_number: string | null;
}

export async function statsNationality() {
  const res = await axios.get(`${BASE}/admin/stats/nationality`, { headers: authHeader() });
  return res.data as { nationality: string; count: number }[];
}

export async function statsAge() {
  const res = await axios.get(`${BASE}/admin/stats/age`, { headers: authHeader() });
  return res.data as { age_group: string; count: number }[];
}

export async function statsTrend() {
  const res = await axios.get(`${BASE}/admin/stats/trend`, { headers: authHeader() });
  return res.data as { date: string; count: number }[];
}

// ──────────────── Types ────────────────

export interface GuestPayload {
  furigana: string;
  name: string;
  gender: "M" | "F";
  phone?: string;
  date_of_birth: string;
  age: number;
  address: string;
  occupation: string;
  nationality: string;
  passport_number: string;
  previous_stay: string;
  destination: string;
  arrival_date: string;
  departure_date: string;
}

export interface GuestResponse extends GuestPayload {
  id: string;
  batch_id: string;
  is_primary: boolean;
  submitted_at: string;
}

export interface BatchResponse {
  id: string;
  title: string;
  room_number?: string;
  created_at: string;
  expires_at: string;
  status: "active" | "closed";
  guest_count: number;
}
