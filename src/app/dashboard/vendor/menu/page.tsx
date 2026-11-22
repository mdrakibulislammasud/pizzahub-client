
"use client";

import AvailabilityToggle from "./AvailabilityToggle";


import {
  useEffect,
  useState,
  useRef,
  type FormEvent,
} from "react";

import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import { toast } from "sonner";

import {
  Pizza,
  Plus,
  Pencil,
  Trash2,
  Upload,
  ArrowLeft,
  Save,
  X,
  LoaderCircle,
  MapPin,
  Crown,
  RefreshCw,
  ShieldCheck,
  ImagePlus,
  Search,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const categories = [
  "Classic Pizzas",
  "Vegetarian Pizzas",
  "Meat Lovers",
  "Specialty / Gourmet Pizzas",
  "Sides & Appetizers",
  "Beverages & Desserts",
];

interface User {
  id: string;
  name: string;
  role: string;
  isBlocked?: boolean;
  businessName?: string;
  subscriptionPlan?: string;
  subscriptionExpiresAt?: string;
}

interface MenuItem {
  _id: string;
  itemName: string;
  category: string;
  description: string;
  price: number;
  location: string;
  images: string[];
  status: string;
  isActive?: boolean;
}

const emptyForm = {
  itemName: "",
  category: categories[0],
  description: "",
  price: "",
  location: "",
};

function formatPrice(price: number) {
  return `\u09F3${price.toLocaleString("en-BD")}`;
}

function statusClass(status: string) {
  switch (status) {
    case "approved":
      return "bg-green-500/10 text-green-400";

    case "pending":
      return "bg-amber-500/10 text-amber-400";

    case "rejected":
      return "bg-red-500/10 text-red-400";

    default:
      return "bg-white/10 text-white";
  }
}

async function getToken(signal?: AbortSignal) {
  const response = await fetch(
    `${API}/api/auth/token`,
    {
      credentials: "include",
      cache: "no-store",
      signal,
    }
  );

  const result = await response.json()
    .catch(() => null);

  if (!response.ok || !result?.token) {
    throw new Error("Authentication failed.");
  }

  return result.token as string;
}

async function request(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = await getToken(
    options.signal || undefined
  );

  const headers = new Headers(options.headers);

  headers.set(
    "Authorization",
    `Bearer ${token}`
  );

  const response = await fetch(
    `${API}${endpoint}`,
    {
      ...options,
      credentials: "include",
      cache: "no-store",
      headers,
    }
  );

  if (response.status === 401) {
    window.location.assign("/sign-in");
    throw new Error("Session expired.");
  }

  const result = await response.json()
    .catch(() => null);

  if (!response.ok || result?.success === false) {
    throw new Error(
      result?.message ||
      `Request failed (${response.status}).`
    );
  }

  return result;
}

export default function VendorMenuPage() {
  const [clockNow, setClockNow] = useState(0);

  useEffect(() => {
    const initialTimer = window.setTimeout(() => {
      setClockNow(clockNow);
    }, 0);

    const intervalTimer = window.setInterval(() => {
      setClockNow(clockNow);
    }, 60000);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(intervalTimer);
    };
  }, []);


  const [user, setUser] =
    useState<User | null>(null);

  const [items, setItems] =
    useState<MenuItem[]>([]);

  const [form, setForm] = useState(emptyForm);

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [image, setImage] =
    useState<File | null>(null);

  const [preview, setPreview] = useState("");

  const [loading, setLoading] = useState(true);

  const [saving, setSaving] = useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [showForm, setShowForm] =
    useState(false);

  const [error, setError] = useState("");

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

  const [deleteTarget, setDeleteTarget] =
    useState<MenuItem | null>(null);

  const [deleting, setDeleting] =
    useState(false);

  const fileInput = useRef<HTMLInputElement>(null);

  const formRef = useRef<HTMLElement>(null);

  const busy = saving || deleting || refreshing;

  const inputClass =
    "w-full rounded-xl border border-[#351010] bg-[#080808] px-4 py-3.5 text-sm text-white focus:border-[#E51B23] focus:outline-none";

  // =====================================
  // LOAD MENU ITEMS
  // =====================================

  async function loadItems(signal?: AbortSignal) {

    const result = await request(
      "/api/menu/vendor/my-items",
      { signal }
    );

    if (!Array.isArray(result?.data)) {
      throw new Error("Invalid menu response.");
    }

    if (!signal?.aborted) {
      setItems(result.data);
    }
  }

  // =====================================
  // VERIFY VENDOR ACCOUNT
  // =====================================

  useEffect(() => {

    const controller = new AbortController();

    async function initialize() {

      try {

        const response = await fetch(
          `${API}/api/auth/get-session?disableCookieCache=true`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          window.location.assign("/sign-in");
          return;
        }

        if (!response.ok) {
          throw new Error(
            "Unable to verify session."
          );
        }

        const session = await response.json();

        if (controller.signal.aborted) return;

        if (!session?.user) {
          window.location.assign("/sign-in");
          return;
        }

        if (
          session.user.role !== "vendor" ||
          session.user.isBlocked
        ) {
          throw new Error(
            "Only active vendors can manage menu items."
          );
        }

        setUser(session.user);

        await loadItems(controller.signal);

      } catch (err) {

        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load menu."
          );
        }

      } finally {

        if (!controller.signal.aborted) {
          setLoading(false);
        }

      }
    }

    initialize();

    return () => controller.abort();

  }, []);

  // =====================================
  // IMAGE PREVIEW CLEANUP
  // =====================================

  useEffect(() => {
    return () => {
      if (preview.startsWith("blob:")) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);

  useEffect(() => {

    if (showForm) {
      formRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }

  }, [showForm, editingId]);

  // =====================================
  // FORM MANAGEMENT
  // =====================================

  function updateField(
    field: keyof typeof emptyForm,
    value: string
  ) {
    setForm(previous => ({
      ...previous,
      [field]: value,
    }));
  }

  function resetForm() {

    setForm({ ...emptyForm });

    setEditingId(null);
    setImage(null);
    setPreview("");
    setError("");

    if (fileInput.current) {
      fileInput.current.value = "";
    }
  }

  function startCreate() {

    if (busy) return;

    resetForm();
    setShowForm(true);

  }

  function startEdit(item: MenuItem) {

    if (busy) return;

    setEditingId(item._id);

    setForm({
      itemName: item.itemName,
      category: item.category,
      description: item.description,
      price: String(item.price),
      location: item.location,
    });

    setImage(null);

    setPreview(item.images?.[0] || "");

    setError("");
    setShowForm(true);

  }

  function closeForm() {

    if (saving) return;

    resetForm();
    setShowForm(false);

  }

  function chooseImage(file?: File) {

    if (!file) return;

    const allowed = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowed.includes(file.type)) {

      toast.error(
        "Choose a JPG, PNG or WebP image."
      );

      if (fileInput.current) {
        fileInput.current.value = "";
      }

      return;
    }

    if (file.size > 5 * 1024 * 1024) {

      toast.error(
        "Image size must be below 5 MB."
      );

      if (fileInput.current) {
        fileInput.current.value = "";
      }

      return;
    }

    setImage(file);
    setPreview(URL.createObjectURL(file));

  }

  // =====================================
  // CREATE OR UPDATE MENU ITEM
  // =====================================

  async function saveItem(
    event: FormEvent<HTMLFormElement>
  ) {

    event.preventDefault();

    if (!user || busy) return;

    setError("");

    const price = Number(form.price);

    if (
      !form.itemName.trim() ||
      !form.description.trim() ||
      !form.location.trim() ||
      !categories.includes(form.category) ||
      !Number.isFinite(price) ||
      price <= 0
    ) {

      setError(
        "Please complete all fields correctly."
      );

      return;
    }

    if (!editingId && !image) {

      setError("A product image is required.");

      return;
    }

    try {

      setSaving(true);

      const data = {
        itemName: form.itemName.trim(),
        category: form.category,
        description: form.description.trim(),
        price,
        location: form.location.trim(),
      };

      if (editingId) {

        // Existing menu item update.

        await request(
          `/api/menu/${encodeURIComponent(editingId)}`,
          {
            method: "PATCH",

            headers: {
              "Content-Type": "application/json",
            },

            body: JSON.stringify(data),
          }
        );

        toast.success(
          "Menu item updated successfully."
        );

      } else {

        // Image is uploaded through the backend.

        const body = new FormData();

        body.append("itemName", data.itemName);
        body.append("category", data.category);
        body.append("description", data.description);
        body.append("price", String(data.price));
        body.append("location", data.location);

        body.append("image", image!);

        await request("/api/menu", {
          method: "POST",
          body,
        });

        toast.success(
          "Menu item submitted for approval."
        );

      }

      resetForm();

      setShowForm(false);

      try {
        await loadItems();
      } catch {
        toast.error(
          "Saved successfully. Refresh to update the list."
        );
      }

    } catch (err) {

      const message =
        err instanceof Error
          ? err.message
          : "Unable to save menu item.";

      setError(message);
      toast.error(message);

    } finally {

      setSaving(false);

    }
  }

  // =====================================
  // DELETE MENU ITEM
  // =====================================

  async function deleteItem() {

    if (!deleteTarget || busy) return;

    try {

      setDeleting(true);

      await request(
        `/api/menu/${encodeURIComponent(
          deleteTarget._id
        )}`,
        {
          method: "DELETE",
        }
      );

      setItems(previous =>
        previous.filter(
          item => item._id !== deleteTarget._id
        )
      );

      if (editingId === deleteTarget._id) {

        resetForm();
        setShowForm(false);

      }

      setDeleteTarget(null);

      toast.success(
        "Menu item deleted successfully."
      );

    } catch (err) {

      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to delete menu item."
      );

    } finally {

      setDeleting(false);

    }

  }

  // =====================================
  // REFRESH
  // =====================================

  async function refresh() {

    if (busy) return;

    try {

      setRefreshing(true);
      setError("");

      await loadItems();

      toast.success("Menu refreshed.");

    } catch (err) {

      setError(
        err instanceof Error
          ? err.message
          : "Refresh failed."
      );

    } finally {

      setRefreshing(false);

    }

  }

  const isPremium =
    user?.subscriptionPlan === "premium" &&
    !!user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt).getTime() >
      clockNow;

  const activeItems = items.filter(
    item => item.status === "approved"
  ).length;

  const pendingItems = items.filter(
    item => item.status === "pending"
  ).length;

  const filteredItems = items.filter(item => {

    const query = search.trim().toLowerCase();

    return (
      (
        filter === "all" ||
        item.status === filter
      ) &&
      (
        item.itemName.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query) ||
        item.location.toLowerCase().includes(query)
      )
    );

  });

  // =====================================
  // LOADING AND ACCESS DENIED
  // =====================================

  if (loading) {

    return (

      <main className="grid min-h-screen place-items-center bg-[#080808] text-white">

        <div className="text-center">

          <LoaderCircle
            size={40}
            className="mx-auto animate-spin text-[#E51B23]"
          />

          <p className="mt-5">
            Loading menu management...
          </p>

        </div>

      </main>

    );

  }

  if (!user) {

    return (

      <main className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white">

        <div className="text-center">

          <ShieldCheck
            size={60}
            className="mx-auto text-[#E51B23]"
          />

          <h1 className="mt-6 text-3xl font-bold">
            Access Unavailable
          </h1>

          <p className="mt-4">
            {error || "Please sign in."}
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex rounded-xl bg-[#C9151B] px-7 py-3 font-bold"
          >
            Back to Home
          </Link>

        </div>

      </main>

    );

  }

  return (

    <MotionConfig reducedMotion="user">

      <div className="min-h-screen bg-[#080808] text-white">

        {/* HEADER */}

        <header className="sticky top-0 z-40 border-b border-[#351010] bg-[#0B0B0B]">

          <nav className="mx-auto flex min-h-20 max-w-7xl flex-wrap items-center justify-between gap-4 px-5">

            <Link
              href="/dashboard/vendor"
              className="flex items-center gap-3"
            >

              <span className="grid h-11 w-11 place-items-center rounded-xl bg-[#C9151B] font-serif text-3xl font-bold italic ph-brand-mark">
                P
              </span>

              <span className="font-serif text-3xl font-bold">
                Pizza
                <span className="text-[#E51B23]">
                  Hub.
                </span>
              </span>

            </Link>

            <Link
              href="/dashboard/vendor"
              className="flex items-center gap-2 text-sm font-semibold hover:text-[#FF4545]"
            >

              <ArrowLeft size={18} />

              Vendor Dashboard

            </Link>

          </nav>

        </header>

        <main className="mx-auto max-w-7xl px-5 py-10">

          {/* PAGE TITLE */}

          <div className="flex flex-wrap items-center justify-between gap-5">

            <div>

              <p className="text-xs font-bold tracking-widest text-[#FF4545]">
                RESTAURANT MANAGEMENT
              </p>

              <h1 className="mt-3 font-serif text-4xl font-bold sm:text-5xl">
                My Menu Items
              </h1>

              <p className="mt-3 text-sm text-white/70">
                Create and manage your restaurant menu.
              </p>

            </div>

            <button
              onClick={startCreate}
              disabled={busy}
              className="flex items-center gap-3 rounded-xl bg-[#C9151B] px-6 py-4 font-bold hover:bg-[#E51B23] disabled:opacity-50"
            >

              <Plus size={21} />

              Add Menu Item

            </button>

          </div>

          {/* STATISTICS */}

          <div className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">

            {[
              {
                label: "Total Items",
                value: items.length,
              },
              {
                label: "Approved Items",
                value: activeItems,
              },
              {
                label: "Pending Items",
                value: pendingItems,
              },
              {
                label: "Subscription",
                value: isPremium
                  ? "Premium"
                  : "Free",
              },
            ].map(stat => (

              <article
                key={stat.label}
                className="rounded-2xl border border-[#351010] bg-[#141414] p-5"
              >

                <p className="text-xs text-white/70">
                  {stat.label}
                </p>

                <p className="mt-3 text-2xl font-bold text-[#FF4545]">
                  {stat.value}
                </p>

              </article>

            ))}

          </div>

          {/* SUBSCRIPTION LIMIT */}

          <div className="mt-6 flex items-center gap-4 rounded-xl border border-[#351010] bg-[#101010] p-5">

            <Crown
              className="shrink-0 text-[#E51B23]"
              size={27}
            />

            <div>

              <p className="font-bold">

                {isPremium
                  ? "Premium Plan"
                  : "Free Plan"}

              </p>

              <p className="mt-1 text-sm text-white/70">

                {isPremium
                  ? "Unlimited active menu items."
                  : "Maximum 3 active menu items. Limits are enforced by the server."}

              </p>

            </div>

          </div>

          {/* ERROR MESSAGE */}

          {error && (

            <div
              role="alert"
              className="mt-6 rounded-xl border border-[#E51B23] bg-[#1C0808] p-4 text-sm text-[#FF7777]"
            >
              {error}
            </div>

          )}

          {/* CREATE / EDIT FORM */}

          {showForm && (

            <motion.section
              ref={formRef}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-8 scroll-mt-24 rounded-2xl border border-[#351010] bg-[#101010] p-6 sm:p-8"
            >

              <div className="flex items-center justify-between gap-4">

                <h2 className="text-2xl font-bold">

                  {editingId
                    ? "Edit Menu Item"
                    : "Add New Menu Item"}

                </h2>

                <button
                  type="button"
                  aria-label="Close form"
                  disabled={saving}
                  onClick={closeForm}
                >

                  <X size={24} />

                </button>

              </div>

              <form
                onSubmit={saveItem}
                className="mt-7 grid gap-8 lg:grid-cols-[1fr_1fr]"
              >

                {/* IMAGE UPLOAD */}

                <div>

                  <p className="mb-3 text-sm font-semibold">
                    Product Image
                  </p>

                  <label
                    className={`flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl border border-dashed border-[#E51B23] bg-[#141414] ${
                      editingId
                        ? ""
                        : "cursor-pointer"
                    }`}
                  >

                    {preview ? (

                      <img
                        src={preview}
                        alt="Menu item preview"
                        className="h-full w-full object-cover"
                      />

                    ) : (

                      <div className="p-5 text-center">

                        <ImagePlus
                          size={50}
                          className="mx-auto text-[#E51B23]"
                        />

                        <p className="mt-4 font-bold">
                          Upload Product Image
                        </p>

                        <p className="mt-2 text-xs text-white/60">
                          JPG, PNG, WebP — up to 5 MB
                        </p>

                      </div>

                    )}

                    {!editingId && (

                      <input
                        ref={fileInput}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        disabled={saving}
                        className="sr-only"
                        onChange={event =>
                          chooseImage(
                            event.target.files?.[0]
                          )
                        }
                      />

                    )}

                  </label>

                  {!editingId ? (

                    <button
                      type="button"
                      disabled={saving}
                      onClick={() =>
                        fileInput.current?.click()
                      }
                      className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-[#351010] bg-[#141414] px-5 py-3 text-sm font-semibold hover:border-[#E51B23]"
                    >

                      <Upload size={18} />

                      {image
                        ? "Change Image"
                        : "Choose Image"}

                    </button>

                  ) : (

                    <p className="mt-3 text-sm text-white/60">
                      The existing image will be preserved.
                    </p>

                  )}

                </div>

                {/* FORM FIELDS */}

                <div className="space-y-5">

                  <label className="block">

                    <span className="mb-2 block text-sm font-semibold">
                      Item Name
                    </span>

                    <input
                      required
                      maxLength={120}
                      disabled={saving}
                      value={form.itemName}
                      onChange={e =>
                        updateField(
                          "itemName",
                          e.target.value
                        )
                      }
                      placeholder="Enter pizza name"
                      className={inputClass}
                    />

                  </label>

                  <label className="block">

                    <span className="mb-2 block text-sm font-semibold">
                      Category
                    </span>

                    <select
                      value={form.category}
                      disabled={saving}
                      onChange={e =>
                        updateField(
                          "category",
                          e.target.value
                        )
                      }
                      className={inputClass}
                    >

                      {categories.map(category => (

                        <option
                          key={category}
                          value={category}
                        >

                          {category}

                        </option>

                      ))}

                    </select>

                  </label>

                  <label className="block">

                    <span className="mb-2 block text-sm font-semibold">
                      Price (BDT)
                    </span>

                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      disabled={saving}
                      value={form.price}
                      onChange={e =>
                        updateField(
                          "price",
                          e.target.value
                        )
                      }
                      placeholder="Enter price"
                      className={inputClass}
                    />

                  </label>

                  <label className="block">

                    <span className="mb-2 block text-sm font-semibold">
                      Restaurant Location
                    </span>

                    <input
                      required
                      maxLength={200}
                      disabled={saving}
                      value={form.location}
                      onChange={e =>
                        updateField(
                          "location",
                          e.target.value
                        )
                      }
                      placeholder="Area, City"
                      className={inputClass}
                    />

                  </label>

                  <label className="block">

                    <span className="mb-2 block text-sm font-semibold">
                      Description
                    </span>

                    <textarea
                      required
                      rows={4}
                      maxLength={2000}
                      disabled={saving}
                      value={form.description}
                      onChange={e =>
                        updateField(
                          "description",
                          e.target.value
                        )
                      }
                      placeholder="Describe the pizza and its toppings."
                      className={`${inputClass} resize-y`}
                    />

                  </label>

                  <div className="flex flex-wrap gap-3">

                    <motion.button
                      type="submit"
                      whileTap={{ scale: 0.98 }}
                      disabled={busy}
                      className="flex min-h-13 flex-1 items-center justify-center gap-3 rounded-xl bg-[#C9151B] px-5 py-4 text-sm font-bold hover:bg-[#E51B23] disabled:opacity-50"
                    >

                      {saving ? (

                        <>

                          <LoaderCircle
                            size={19}
                            className="animate-spin"
                          />

                          Saving...

                        </>

                      ) : (

                        <>

                          <Save size={19} />

                          {editingId
                            ? "Save Changes"
                            : "Submit for Approval"}

                        </>

                      )}

                    </motion.button>

                    <button
                      type="button"
                      disabled={saving}
                      onClick={closeForm}
                      className="rounded-xl border border-[#351010] px-6 py-3 font-semibold"
                    >
                      Cancel
                    </button>

                  </div>

                </div>

              </form>

            </motion.section>

          )}

          {/* SEARCH AND FILTER */}

          <div className="my-8 flex flex-wrap gap-3">

            <label className="flex flex-1 items-center gap-3 rounded-xl border border-[#351010] bg-[#141414] px-4 focus-within:border-[#E51B23]">

              <Search
                size={19}
                className="shrink-0 text-[#E51B23]"
              />

              <input
                value={search}
                onChange={e =>
                  setSearch(e.target.value)
                }
                placeholder="Search menu items..."
                aria-label="Search menu items"
                className="w-full min-w-0 bg-transparent py-4 text-sm outline-none"
              />

            </label>

            <select
              value={filter}
              aria-label="Filter menu status"
              onChange={e =>
                setFilter(e.target.value)
              }
              className="rounded-xl border border-[#351010] bg-[#141414] px-4 py-3 text-sm"
            >

              <option value="all">
                All Statuses
              </option>

              <option value="approved">
                Approved
              </option>

              <option value="pending">
                Pending
              </option>

              <option value="rejected">
                Rejected
              </option>

              <option value="inactive">
                Inactive
              </option>

            </select>

            <button
              onClick={refresh}
              disabled={busy}
              aria-label="Refresh menu"
              className="rounded-xl border border-[#351010] bg-[#141414] p-4 hover:border-[#E51B23]"
            >

              <RefreshCw
                size={19}
                className={
                  refreshing
                    ? "animate-spin"
                    : ""
                }
              />

            </button>

          </div>

          {/* EMPTY STATE */}

          {!error && filteredItems.length === 0 && (

            <div className="rounded-2xl border border-[#351010] bg-[#141414] py-20 text-center">

              <Pizza
                size={60}
                className="mx-auto text-[#E51B23]"
              />

              <h2 className="mt-5 text-2xl font-bold">
                No Menu Items Found
              </h2>

              <p className="mt-3 text-sm text-white/70">
                Add your first item or adjust your filters.
              </p>

              <button
                onClick={startCreate}
                disabled={busy}
                className="mt-6 rounded-xl bg-[#C9151B] px-6 py-3.5 font-bold"
              >

                Add Menu Item

              </button>

            </div>

          )}

          {/* MENU ITEM CARDS */}

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {filteredItems.map((item, index) => (

              <motion.article
                key={item._id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: Math.min(index * 0.05, 0.3),
                }}
                className="flex flex-col overflow-hidden rounded-2xl border border-[#351010] bg-[#141414]"
              >

                <div className="relative aspect-[4/3] overflow-hidden">

                  {item.images?.[0] ? (

                    <img
                      src={item.images[0]}
                      alt={item.itemName}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />

                  ) : (

                    <div className="grid h-full place-items-center bg-[#101010]">

                      <Pizza
                        size={48}
                        className="text-[#E51B23]"
                      />

                    </div>

                  )}

                  <span className="absolute left-3 top-3 rounded-lg bg-black/90 px-3 py-2 text-xs font-bold">

                    {item.category}

                  </span>

                </div>

                <div className="flex flex-1 flex-col p-5">

                  <div className="flex flex-wrap items-center justify-between gap-2">

                    <span
                      className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusClass(item.status)}`}
                    >

                      {item.status}

                    </span>

                  </div>

                  <h3 className="mt-4 text-lg font-bold">

                    {item.itemName}

                  </h3>

                  <p className="mt-3 flex items-center gap-2 text-sm text-white/70">

                    <MapPin
                      size={16}
                      className="shrink-0 text-[#E51B23]"
                    />

                    {item.location}

                  </p>

                  <p className="mt-4 text-2xl font-bold text-[#FF4545]">

                    {formatPrice(item.price)}

                  </p>

                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/70">

                    {item.description}

                  </p>

                  <div className="mt-auto pt-5">

                    <div className="grid grid-cols-2 gap-3 border-t border-[#351010] pt-5">

                      <button
                        disabled={busy}
                        onClick={() => startEdit(item)}
                        className="flex items-center justify-center gap-2 rounded-lg bg-[#C9151B] py-3 text-sm font-bold hover:bg-[#E51B23] disabled:opacity-50"
                      >

                        <Pencil size={16} />

                        Edit

                      </button>

                      <button
                        disabled={busy}
                        onClick={() =>
                          setDeleteTarget(item)
                        }
                        className="flex items-center justify-center gap-2 rounded-lg border border-[#E51B23] py-3 text-sm font-bold text-[#FF4545] hover:bg-[#1C0808] disabled:opacity-50"
                      >

                        <Trash2 size={16} />

                        Delete

                      </button>

                    </div>

                  </div>

                </div>


    <AvailabilityToggle
      item={item}
      onChanged={(isActive) => {
        setItems((previous) =>
          previous.map((entry) =>
            entry._id === item._id
              ? { ...entry, isActive }
              : entry
          )
        );
      }}
    />
  </motion.article>

            ))}

          </div>

        </main>

        {/* DELETE CONFIRMATION */}

        {deleteTarget && (

          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-5">

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Delete menu item"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm rounded-2xl border border-[#351010] bg-[#101010] p-7 text-center"
            >

              <Trash2
                size={45}
                className="mx-auto text-[#E51B23]"
              />

              <h2 className="mt-5 text-2xl font-bold">
                Delete Menu Item?
              </h2>

              <p className="mt-4 text-sm leading-6 text-white/80">

                Are you sure you want to delete{" "}

                <strong>
                  {deleteTarget.itemName}
                </strong>

                ?

              </p>

              <div className="mt-7 grid grid-cols-2 gap-3">

                <button
                  disabled={deleting}
                  onClick={() =>
                    setDeleteTarget(null)
                  }
                  className="rounded-xl border border-[#351010] py-3 font-semibold"
                >

                  Cancel

                </button>

                <button
                  disabled={deleting}
                  onClick={deleteItem}
                  className="rounded-xl bg-[#C9151B] py-3 font-bold disabled:opacity-50"
                >

                  {deleting
                    ? "Deleting..."
                    : "Delete Item"}

                </button>

              </div>

            </motion.div>

          </div>

        )}

        <footer className="mt-10 border-t border-[#351010] px-5 py-8 text-center text-sm text-white/60">

          PizzaHub Vendor Management

        </footer>

      </div>

    </MotionConfig>

  );

}
