import React, { useEffect, useState } from "react";
import {
  addDoc, collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query,
  serverTimestamp, updateDoc,
} from "firebase/firestore";
import { Megaphone, Pencil, Plus, Trash2, X } from "lucide-react";
import { db } from "./firebase-client";
import { useConfirm } from "./ConfirmDialog";

const PINNED_ADS = collection(db, "artifacts/edunexus-live/public/data/pinned_ads");

const EMPTY_FORM = {
  title: "",
  description: "",
  mediaType: "video",
  videoUrl: "",
  imageUrl: "",
  thumbnailUrl: "",
  size: "medium",
  position: "bottom-left",
  isActive: true,
  startAt: "",
  endAt: "",
};

const MEDIA_TYPES = [
  { value: "video", label: "Video" },
  { value: "image", label: "Picture" },
  { value: "text", label: "Text only" },
];

const PLAYER_SIZES = [
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "large", label: "Large" },
];

const PLAYER_POSITIONS = [
  { value: "top-left", label: "Top left" },
  { value: "top-center", label: "Top center" },
  { value: "top-right", label: "Top right" },
  { value: "middle-left", label: "Middle left" },
  { value: "center", label: "Center" },
  { value: "middle-right", label: "Middle right" },
  { value: "bottom-left", label: "Bottom left" },
  { value: "bottom-center", label: "Bottom center" },
  { value: "bottom-right", label: "Bottom right" },
];

function toInputValue(ts) {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function toTimestamp(value) {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * AdminPinnedAds — full CRUD + scheduling for dashboard pinned video ads.
 * Embedded as a tab inside the Admin Panel (?page=admin), which already
 * gates admin access.
 */
export default function AdminPinnedAds({ showToast }) {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const { requestConfirm, ConfirmUI } = useConfirm();

  useEffect(() => {
    const q = query(PINNED_ADS, orderBy("createdAt", "desc"));
    return onSnapshot(q,
      (snap) => {
        setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoadError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Pinned ads load failed:", err);
        setLoadError("Could not load pinned ads. Check your connection and retry.");
        setLoading(false);
      });
  }, []);

  const retryLoad = () => {
    setLoading(true);
    setLoadError(null);
    getDocs(query(PINNED_ADS, orderBy("createdAt", "desc")))
      .then((snap) => {
        setAds(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      })
      .catch((err) => {
        console.error("Pinned ads retry failed:", err);
        setLoadError("Could not load pinned ads. Check your connection and retry.");
        setLoading(false);
      });
  };

  const set = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const startEdit = (ad) => {
    setEditingId(ad.id);
    setForm({
      title: ad.title || "",
      description: ad.description || "",
      mediaType: ad.mediaType === "image" || ad.mediaType === "text" ? ad.mediaType : "video",
      videoUrl: ad.videoUrl || "",
      imageUrl: ad.imageUrl || "",
      thumbnailUrl: ad.thumbnailUrl || "",
      size: ad.size || "medium",
      position: ad.position || "bottom-left",
      isActive: ad.isActive !== false,
      startAt: toInputValue(ad.startAt),
      endAt: toInputValue(ad.endAt),
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    const mediaType = form.mediaType;
    if (mediaType === "video" && !form.videoUrl.trim()) {
      if (showToast) showToast("Video URL is required for a video ad.", "error");
      return;
    }
    if (mediaType === "image" && !form.imageUrl.trim()) {
      if (showToast) showToast("Image URL is required for a picture ad.", "error");
      return;
    }
    if (mediaType === "text" && !form.title.trim() && !form.description.trim()) {
      if (showToast) showToast("Title or description is required for a text ad.", "error");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        mediaType,
        videoUrl: form.videoUrl.trim(),
        imageUrl: form.imageUrl.trim(),
        thumbnailUrl: form.thumbnailUrl.trim(),
        size: form.size,
        position: form.position,
        isActive: !!form.isActive,
        startAt: toTimestamp(form.startAt),
        endAt: toTimestamp(form.endAt),
        updatedAt: serverTimestamp(),
      };
      if (editingId) {
        await updateDoc(doc(PINNED_ADS, editingId), payload);
        if (showToast) showToast("Ad updated.", "success");
      } else {
        await addDoc(PINNED_ADS, {
          ...payload,
          createdAt: serverTimestamp(),
        });
        if (showToast) showToast("Ad created.", "success");
      }
      cancelEdit();
    } catch (err) {
      console.error("Pinned ad save failed:", err);
      if (showToast) showToast("Could not save the ad.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (ad) => {
    requestConfirm({
      message: `Permanently delete the pinned ad "${ad.title || ad.videoUrl}"?`,
      confirmLabel: "Delete",
      danger: true,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(PINNED_ADS, ad.id));
          if (showToast) showToast("Ad deleted.", "success");
        } catch (err) {
          console.error("Pinned ad delete failed:", err);
          if (showToast) showToast("Could not delete the ad.", "error");
        }
      },
    });
  };

  const toggleActive = async (ad) => {
    try {
      await updateDoc(doc(PINNED_ADS, ad.id), {
        isActive: !(ad.isActive !== false),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error("Pinned ad toggle failed:", err);
      if (showToast) showToast("Could not update the ad.", "error");
    }
  };

  const statusOf = (ad) => {
    if (ad.isActive === false) return { label: "Disabled", tone: "bg-slate-400" };
    const now = Date.now();
    const start = ad.startAt ? (ad.startAt.toMillis ? ad.startAt.toMillis() : new Date(ad.startAt).getTime()) : null;
    const end = ad.endAt ? (ad.endAt.toMillis ? ad.endAt.toMillis() : new Date(ad.endAt).getTime()) : null;
    if (start && now < start) return { label: "Scheduled", tone: "bg-amber-500" };
    if (end && now > end) return { label: "Expired", tone: "bg-slate-400" };
    return { label: "Live", tone: "bg-emerald-500" };
  };

  return (
    <div className="space-y-6">
      <ConfirmUI />

      {/* Create / Edit form */}
      <form onSubmit={handleSave} className="rounded-2xl border border-indigo-200 dark:border-indigo-900 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
          <Megaphone size={18} className="text-indigo-500" />
          {editingId ? "Edit pinned ad" : "New pinned ad"}
        </h3>

        <div className="mt-4 grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Media type</span>
            <select
              value={form.mediaType}
              onChange={(e) => set("mediaType", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              {MEDIA_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Title</span>
            <input
              type="text"
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              placeholder="e.g. Welcome to EduNexus"
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </label>
          {form.mediaType === "video" && (
            <label className="block">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Video URL *</span>
              <input
                type="url"
                value={form.videoUrl}
                onChange={(e) => set("videoUrl", e.target.value)}
                placeholder="https://…/intro.mp4"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </label>
          )}
          {form.mediaType === "image" && (
            <label className="block">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Image URL *</span>
              <input
                type="url"
                value={form.imageUrl}
                onChange={(e) => set("imageUrl", e.target.value)}
                placeholder="https://…/banner.jpg"
                required
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </label>
          )}
          {form.mediaType === "video" && (
            <label className="block">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Thumbnail URL (optional)</span>
              <input
                type="url"
                value={form.thumbnailUrl}
                onChange={(e) => set("thumbnailUrl", e.target.value)}
                placeholder="https://…/poster.jpg"
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </label>
          )}
          <label className="block sm:col-span-2">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Description</span>
            <textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              placeholder="Short text shown under the media…"
              rows={2}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Player size</span>
            <select
              value={form.size}
              onChange={(e) => set("size", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              {PLAYER_SIZES.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Position on dashboard</span>
            <select
              value={form.position}
              onChange={(e) => set("position", e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              {PLAYER_POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Start (optional)</span>
              <input
                type="datetime-local"
                value={form.startAt}
                onChange={(e) => set("startAt", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">End (optional)</span>
              <input
                type="datetime-local"
                value={form.endAt}
                onChange={(e) => set("endAt", e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </label>
          </div>
        </div>

        <label className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-slate-700 dark:text-slate-200 cursor-pointer">
          <input
            type="checkbox"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
            className="h-4 w-4 rounded accent-indigo-600"
          />
          Active (eligible to show on dashboard)
        </label>

        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {editingId ? "Save changes" : (<><Plus size={15} /> Create ad</>)}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 dark:border-slate-700 px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-300"
            >
              <X size={15} /> Cancel
            </button>
          )}
        </div>
      </form>

      {/* Ad list */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm">
        <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">All pinned ads ({ads.length})</h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading…</p>
        ) : loadError ? (
          <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-sm text-red-600">{loadError}</p>
            <button
              type="button"
              onClick={retryLoad}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white hover:bg-indigo-700 w-fit"
            >
              Retry
            </button>
          </div>
        ) : ads.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No pinned ads yet. Create one above.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {ads.map((ad) => {
              const status = statusOf(ad);
              return (
                <div key={ad.id} className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-black text-white ${status.tone}`}>
                        {status.label}
                      </span>
                      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-bold bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200">
                        {ad.mediaType === "image" ? "Picture" : ad.mediaType === "text" ? "Text" : "Video"}
                      </span>
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {ad.title || "(untitled)"}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-500 truncate">
                      {ad.mediaType === "image" ? ad.imageUrl : ad.mediaType === "text" ? (ad.description || ad.title) : ad.videoUrl}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Size: {ad.size || "medium"} · Position: {(ad.position || "bottom-left").replace(/-/g, " ")}
                    </p>
                    {(ad.startAt || ad.endAt) && (
                      <p className="mt-0.5 text-xs text-slate-400">
                        {ad.startAt ? `From ${toInputValue(ad.startAt).replace("T", " ")}` : ""}
                        {ad.startAt && ad.endAt ? " → " : ""}
                        {ad.endAt ? `Until ${toInputValue(ad.endAt).replace("T", " ")}` : ""}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleActive(ad)}
                      title={ad.isActive !== false ? "Disable" : "Enable"}
                      className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                        ad.isActive !== false
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                          : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      }`}
                    >
                      {ad.isActive !== false ? "Disable" : "Enable"}
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(ad)}
                      title="Edit"
                      className="p-2 rounded-lg bg-indigo-100 text-indigo-600 hover:bg-indigo-200"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(ad)}
                      title="Delete"
                      className="p-2 rounded-lg bg-red-100 text-red-600 hover:bg-red-200"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
