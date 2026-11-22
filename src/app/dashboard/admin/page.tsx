"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import { toast } from "sonner";

import {
  LayoutDashboard,
  Users,
  UserRound,
  Store,
  Pizza,
  CreditCard,
  Clock,
  ShieldCheck,
  ShieldBan,
  ShieldOff,
  Search,
  RefreshCw,
  LogOut,
  Menu,
  X,
  Home,
  CheckCircle,
  XCircle,
  LoaderCircle,
  Trash2,
  AlertTriangle,
  Eye,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

type Tab = "overview" | "users" | "menu" | "orders" | "transactions";

type Data = Record<string, unknown>;

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  image?: string;
  isBlocked?: boolean;
}

interface ConfirmAction {
  title: string;
  message: string;
  label: string;
  endpoint: string;
  method: "PATCH" | "DELETE";
  body?: Data;
  destructive: boolean;
  successMessage: string;
}

function str(value: unknown) {
  return typeof value === "string" ? value : "";
}

function obj(value: unknown): Data {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Data)
    : {};
}

function getId(value: Data) {
  return str(value._id) || str(value.id);
}

function rows(result: unknown, key: string): Data[] {
  const root = obj(result);
  const data = root.data ?? result;

  const list = Array.isArray(data) ? data : (obj(data)[key] ?? obj(data).items);

  if (!Array.isArray(list)) {
    throw new Error("Unexpected " + key + " response.");
  }

  return list.map(obj);
}

function formatDate(value: unknown) {
  if (!value) return "Not available";

  const date = new Date(String(value));

  return Number.isNaN(date.getTime())
    ? "Not available"
    : date.toLocaleDateString("en-GB");
}

function formatPrice(value: unknown) {
  if (typeof value !== "number") return "Unavailable";

  return `\u09F3${value.toLocaleString("en-BD")}`;
}

function Status({ value }: { value: string }) {
  const color = [
    "approved",
    "accepted",
    "active",
    "paid",
    "success",
    "succeeded",
    "premium",
  ].includes(value)
    ? "bg-green-500/10 text-green-400"
    : value === "pending"
      ? "bg-amber-500/10 text-amber-400"
      : ["blocked", "rejected", "failed"].includes(value)
        ? "bg-red-500/10 text-red-400"
        : "bg-white/10 text-white";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1.5 text-xs font-bold capitalize ${color}`}
    >
      {value || "Unknown"}
    </span>
  );
}

async function request(path: string, options: RequestInit = {}) {
  const tokenResponse = await fetch(`${API}/api/auth/token`, {
    credentials: "include",
    cache: "no-store",
    signal: options.signal,
  });

  const auth = await tokenResponse.json().catch(() => null);

  if (!tokenResponse.ok || !auth?.token) {
    throw new Error("Authentication failed.");
  }

  const headers = new Headers(options.headers);

  headers.set("Authorization", `Bearer ${auth.token}`);

  const response = await fetch(`${API}${path}`, {
    ...options,
    headers,
    credentials: "include",
    cache: "no-store",
  });

  const result = await response.json().catch(() => null);

  if (!response.ok || result?.success === false) {
    throw new Error(result?.message || `Request failed (${response.status}).`);
  }

  return result;
}

const nav = [
  {
    id: "overview" as const,
    name: "Overview",
    icon: LayoutDashboard,
  },
  {
    id: "users" as const,
    name: "Manage Users",
    icon: Users,
  },
  {
    id: "menu" as const,
    name: "Manage Menu Items",
    icon: Pizza,
  },
  {
    id: "orders" as const,
    name: "All Orders",
    icon: Clock,
  },
  {
    id: "transactions" as const,
    name: "Transactions",
    icon: CreditCard,
  },
];

export default function AdminDashboard() {
  const [user, setUser] = useState<User | null>(null);

  const [overview, setOverview] = useState<Data>({});

  const [users, setUsers] = useState<Data[]>([]);

  const [items, setItems] = useState<Data[]>([]);

  const [orders, setOrders] = useState<Data[]>([]);
  const [transactions, setTransactions] = useState<Data[]>([]);

  const [tab, setTab] = useState<Tab>("overview");

  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState("all");

  const [accountStatus, setAccountStatus] = useState("all");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [processing, setProcessing] = useState(false);

  const [mobileMenu, setMobileMenu] = useState(false);

  const [accessDenied, setAccessDenied] = useState(false);

  const [error, setError] = useState("");

  const [sectionErrors, setSectionErrors] = useState<
    Partial<Record<Tab, string>>
  >({});

  const [confirmation, setConfirmation] = useState<ConfirmAction | null>(null);

  const [selected, setSelected] = useState<{
    title: string;
    fields: [string, string][];
  } | null>(null);

  const busy = processing || refreshing;

  const fieldClass =
    "rounded-xl border border-[#351010] bg-[#141414] px-4 py-3 text-sm text-white";

  // =====================================
  // LOAD ADMIN DATA
  // =====================================

  async function loadData(signal?: AbortSignal) {
    const errors: Partial<Record<Tab, string>> = {};

    async function load(key: Tab, fn: () => Promise<void>) {
      try {
        await fn();
      } catch (err) {
        if (!signal?.aborted) {
          errors[key] =
            err instanceof Error ? err.message : "Unable to load data.";
        }
      }
    }

    await Promise.all([
      load("overview", async () => {
        const result = await request("/api/admin/overview", { signal });

        if (!signal?.aborted) {
          setOverview(obj(result?.data ?? result));
        }
      }),

      load("users", async () => {
        const result = await request("/api/admin/users", { signal });

        const data = rows(result, "users");

        if (!signal?.aborted) {
          setUsers(data);
        }
      }),

      load("menu", async () => {
        const result = await request("/api/admin/menu-items", { signal });

        const data = rows(result, "menuItems");

        if (!signal?.aborted) {
          setItems(data);
        }
      }),

      load("orders", async () => {
        const result = await request("/api/admin/orders", { signal });

        const data = rows(result, "orders");

        if (!signal?.aborted) {
          setOrders(data);
        }
      }),
      load("transactions", async () => {
        const result = await request("/api/admin/transactions", { signal });

        const data = rows(result, "transactions");

        if (!signal?.aborted) {
          setTransactions(data);
        }
      }),
    ]);

    if (!signal?.aborted) {
      setSectionErrors(errors);
    }
  }

  // =====================================
  // ADMIN AUTHENTICATION
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
          },
        );

        if (response.status === 401) {
          window.location.assign("/sign-in");
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to verify session.");
        }

        const session = await response.json();

        if (controller.signal.aborted) return;

        if (!session?.user) {
          window.location.assign("/sign-in");
          return;
        }

        if (session.user.role !== "admin" || session.user.isBlocked) {
          setAccessDenied(true);
          return;
        }

        setUser(session.user);

        await loadData(controller.signal);
      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error ? err.message : "Dashboard unavailable.",
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
  // REFRESH
  // =====================================

  async function refresh() {
    if (busy) return;

    setRefreshing(true);

    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }

  // =====================================
  // BLOCK / UNBLOCK USER
  // =====================================

  function changeBlockStatus(account: Data) {
    const id = getId(account);

    if (
      !id ||
      !user ||
      busy ||
      id === user.id ||
      account.role === "admin" ||
      typeof account.isBlocked !== "boolean"
    ) {
      return;
    }

    const blocked = account.isBlocked === true;
    const nextStatus = !blocked;

    setConfirmation({
      title: nextStatus ? "Block User?" : "Unblock User?",

      message: nextStatus
        ? `${str(account.name)} will lose access to protected platform features.`
        : `${str(account.name)} will regain account access.`,

      label: nextStatus ? "Block User" : "Unblock User",

      endpoint: `/api/admin/users/${encodeURIComponent(id)}/block`,

      method: "PATCH",

      body: {
        isBlocked: nextStatus,
      },

      destructive: nextStatus,

      successMessage: nextStatus
        ? "User blocked successfully."
        : "User unblocked successfully.",
    });
  }

  // =====================================
  // APPROVE / REJECT MENU ITEMS
  // =====================================

  function updateMenuStatus(item: Data, status: "approved" | "rejected") {
    const id = getId(item);

    if (!id || busy) return;

    setConfirmation({
      title: status === "approved" ? "Approve Menu Item?" : "Reject Menu Item?",

      message:
        status === "approved"
          ? `Approve ${str(item.itemName)} for the public menu, subject to vendor limits.`
          : `Reject ${str(item.itemName)} and remove it from public visibility.`,

      label: status === "approved" ? "Approve Item" : "Reject Item",

      endpoint: `/api/admin/menu-items/${encodeURIComponent(id)}/status`,

      method: "PATCH",

      body: { status },

      destructive: status === "rejected",

      successMessage: `Menu item ${status} successfully.`,
    });
  }

  // =====================================
  // DELETE MENU ITEM
  // =====================================

  function deleteMenuItem(item: Data) {
    const id = getId(item);

    if (!id || busy) return;

    setConfirmation({
      title: "Delete Menu Item?",

      message: `Are you sure you want to delete ${str(item.itemName)}? This action may be irreversible.`,

      label: "Delete Item",

      endpoint: `/api/admin/menu-items/${encodeURIComponent(id)}`,

      method: "DELETE",

      destructive: true,

      successMessage: "Menu item deleted successfully.",
    });
  }

  // =====================================
  // EXECUTE ADMIN ACTION
  // =====================================

  async function executeAction() {
    if (!confirmation || busy) return;

    try {
      setProcessing(true);

      await request(confirmation.endpoint, {
        method: confirmation.method,

        ...(confirmation.body
          ? {
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(confirmation.body),
            }
          : {}),
      });

      toast.success(confirmation.successMessage);

      setConfirmation(null);

      await loadData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setProcessing(false);
    }
  }

  // =====================================
  // LOGOUT
  // =====================================

  async function logout() {
    try {
      const response = await fetch(`${API}/api/auth/sign-out`, {
        method: "POST",
        credentials: "include",

        headers: {
          "Content-Type": "application/json",
        },

        body: "{}",
      });

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      window.location.assign("/sign-in");
    } catch {
      toast.error("Unable to sign out.");
    }
  }

  function changeTab(value: Tab) {
    setTab(value);
    setSearch("");
    setFilter("all");
    setAccountStatus("all");
    setMobileMenu(false);
  }

  // =====================================
  // DASHBOARD STATISTICS
  // =====================================

  function count(keys: string[]) {
    const data = {
      ...obj(overview.stats),
      ...overview,
    };

    for (const key of keys) {
      if (typeof data[key] === "number") {
        return data[key] as number;
      }
    }

    return "Ã¢â‚¬â€";
  }

  const stats = [
    {
      name: "Total Users",
      value: count(["totalUsers", "totalRegisteredUsers", "users"]),
      icon: Users,
    },
    {
      name: "Total Vendors",
      value: count(["totalVendors", "vendors"]),
      icon: Store,
    },
    {
      name: "Total Customers",
      value: count(["totalCustomers", "customers"]),
      icon: UserRound,
    },
    {
      name: "Total Menu Items",
      value: count(["totalMenuItems", "totalItems", "menuItems"]),
      icon: Pizza,
    },
    {
      name: "Pending Items",
      value: count(["pendingMenuItems", "pendingItems"]),
      icon: Clock,
    },
    {
      name: "Total Transactions",
      value: count(["totalTransactions", "transactions"]),
      icon: CreditCard,
    },
  ];

  const query = search.trim().toLowerCase();

  const filteredUsers = users.filter((account) => {
    const matchesRole = filter === "all" || account.role === filter;

    const matchesStatus =
      accountStatus === "all" ||
      (accountStatus === "blocked" && account.isBlocked === true) ||
      (accountStatus === "active" && account.isBlocked === false);

    const matchesSearch =
      str(account.name).toLowerCase().includes(query) ||
      str(account.email).toLowerCase().includes(query);

    return matchesRole && matchesStatus && matchesSearch;
  });

  const filteredItems = items.filter(
    (item) =>
      (filter === "all" || item.status === filter) &&
      (str(item.itemName).toLowerCase().includes(query) ||
        str(item.category).toLowerCase().includes(query) ||
        str(item.location).toLowerCase().includes(query)),
  );

  const filteredOrders = orders.filter((order) => {
    const menuItem = obj(order.menuItem);
    const customer = obj(order.customer);
    const vendor = obj(order.vendor);

    const status = str(order.status).toLowerCase();

    const matchesStatus = filter === "all" || status === filter;

    const searchableValues = [
      getId(order),
      str(menuItem.itemName),
      str(customer.name),
      str(customer.email),
      str(vendor.name),
      str(vendor.businessName),
      str(vendor.email),
      str(order.deliveryAddress),
    ];

    const matchesSearch = searchableValues.some((value) =>
      value.toLowerCase().includes(query),
    );

    return matchesStatus && matchesSearch;
  });
  const filteredTransactions = transactions.filter((transaction) => {
    const vendor = obj(transaction.vendor);

    const status = str(transaction.paymentStatus) || str(transaction.status);

    const name = str(vendor.name) || str(transaction.vendorName);

    const email = str(vendor.email) || str(transaction.vendorEmail);

    return (
      (filter === "all" || status === filter) &&
      (name.toLowerCase().includes(query) ||
        email.toLowerCase().includes(query) ||
        str(transaction.vendorId).toLowerCase().includes(query))
    );
  });

  // =====================================
  // LOADING
  // =====================================

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080808] text-white">
        <div className="text-center">
          <LoaderCircle
            size={42}
            className="mx-auto animate-spin text-[#E51B23]"
          />

          <p className="mt-5">Loading Admin Dashboard...</p>
        </div>
      </main>
    );
  }

  // =====================================
  // ACCESS CONTROL
  // =====================================

  if (accessDenied || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white">
        <div className="text-center">
          <ShieldCheck size={65} className="mx-auto text-[#E51B23]" />

          <h1 className="mt-6 text-3xl font-bold">
            {accessDenied ? "Access Denied" : "Dashboard Unavailable"}
          </h1>

          <p className="mt-4">
            {accessDenied
              ? "Only active admin accounts can access this dashboard."
              : error || "Please sign in."}
          </p>

          <Link
            href="/"
            className="mt-7 inline-flex rounded-xl bg-[#C9151B] px-6 py-3 font-bold"
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
        {mobileMenu && (
          <button
            aria-label="Close sidebar"
            onClick={() => setMobileMenu(false)}
            className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          />
        )}

        {/* SIDEBAR */}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-63.75 flex-col border-r border-[#351010] bg-[#101010] transition-transform lg:translate-x-0 ${
            mobileMenu ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex h-24 items-center justify-between px-6">
            <Link href="/" className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#C9151B] font-serif text-3xl font-bold italic ph-brand-mark">
                P
              </span>

              <span className="font-serif text-2xl font-bold">
                Pizza
                <span className="text-[#E51B23]">Hub.</span>
              </span>
            </Link>

            <button
              onClick={() => setMobileMenu(false)}
              aria-label="Close sidebar"
              className="lg:hidden"
            >
              <X size={22} />
            </button>
          </div>

          <div className="mx-4 flex items-center gap-3 rounded-xl border border-[#351010] bg-[#141414] p-4">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#C9151B]">
              <ShieldCheck size={23} />
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{user.name}</p>

              <p className="mt-1 text-xs text-[#FF4545]">Administrator</p>
            </div>
          </div>

          <nav className="mt-8 flex-1 space-y-2 overflow-y-auto px-4">
            <p className="mb-4 px-3 text-xs tracking-widest text-white/60">
              ADMINISTRATION
            </p>

            {nav.map((item) => (
              <button
                key={item.id}
                onClick={() => changeTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold transition ${
                  tab === item.id ? "bg-[#C9151B]" : "hover:bg-[#1C0808]"
                }`}
              >
                <item.icon size={20} />

                {item.name}
              </button>
            ))}

            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-[#1C0808]"
            >
              <Home size={20} />
              Home
            </Link>
          </nav>

          <div className="border-t border-[#351010] p-4">
            <button
              onClick={logout}
              disabled={processing}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-4 font-semibold text-[#FF4545]"
            >
              <LogOut size={19} />
              Sign Out
            </button>
          </div>
        </aside>

        {/* MAIN CONTENT */}

        <div className="lg:ml-63.75">
          <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-[#351010] bg-[#0B0B0B] px-5 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                aria-label="Open sidebar"
                onClick={() => setMobileMenu(true)}
                className="lg:hidden"
              >
                <Menu size={24} />
              </button>

              <h1 className="text-xl font-bold">
                {nav.find((item) => item.id === tab)?.name}
              </h1>
            </div>

            <button
              disabled={busy}
              onClick={refresh}
              className="flex items-center gap-2 rounded-xl border border-[#351010] bg-[#141414] px-4 py-3 text-sm disabled:opacity-50"
            >
              <RefreshCw
                size={18}
                className={refreshing ? "animate-spin" : ""}
              />
              Refresh
            </button>
          </header>

          <main className="mx-auto max-w-375 p-5 lg:p-8">
            {sectionErrors[tab] && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-[#E51B23] bg-[#1C0808] p-5 text-[#FF7777]"
              >
                {sectionErrors[tab]}
              </div>
            )}

            {/* OVERVIEW */}

            {tab === "overview" && (
              <>
                <motion.section
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border border-[#351010] bg-[#141414] p-8"
                >
                  <p className="text-xs font-bold tracking-widest text-[#FF4545]">
                    ADMIN CONTROL CENTER
                  </p>

                  <h2 className="mt-4 font-serif text-4xl font-bold">
                    Welcome, {user.name}!
                  </h2>

                  <p className="mt-4 text-sm text-white/70">
                    Monitor and manage the PizzaHub platform.
                  </p>
                </motion.section>

                <div className="mt-8 grid grid-cols-2 gap-4 xl:grid-cols-3">
                  {stats.map((item, index) => (
                    <motion.article
                      key={item.name}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.06,
                      }}
                      className="rounded-2xl border border-[#351010] bg-[#141414] p-6"
                    >
                      <item.icon size={28} className="text-[#FF4545]" />

                      <p className="mt-5 text-sm">{item.name}</p>

                      <p className="mt-3 text-4xl font-bold">
                        {sectionErrors.overview ? "Ã¢â‚¬â€" : item.value}
                      </p>
                    </motion.article>
                  ))}
                </div>

                <section className="mt-8 rounded-2xl border border-[#351010] bg-[#141414] p-6">
                  <h2 className="text-xl font-bold">Quick Actions</h2>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    {nav.slice(1).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => changeTab(item.id)}
                        className="flex items-center gap-3 rounded-xl border border-[#351010] bg-[#080808] p-4 text-sm font-bold hover:border-[#E51B23]"
                      >
                        <item.icon size={20} className="text-[#FF4545]" />

                        {item.name}
                      </button>
                    ))}
                  </div>
                </section>
              </>
            )}

            {/* MANAGE USERS */}

            {tab === "users" && (
              <>
                <h2 className="text-3xl font-bold">Manage Users</h2>

                <p className="mt-3 text-sm text-white/70">
                  View and manage registered platform accounts.
                </p>

                <div className="my-6 flex flex-wrap gap-3">
                  <label className="flex min-w-50 flex-1 items-center gap-3 rounded-xl border border-[#351010] bg-[#141414] px-4">
                    <Search size={19} className="text-[#FF4545]" />

                    <input
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search name or email"
                      className="w-full min-w-0 bg-transparent py-4 text-sm outline-none"
                    />
                  </label>

                  <select
                    value={filter}
                    aria-label="Filter by role"
                    onChange={(e) => setFilter(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="all">All Roles</option>

                    <option value="customer">Customer</option>

                    <option value="vendor">Vendor</option>

                    <option value="admin">Admin</option>
                  </select>

                  <select
                    value={accountStatus}
                    aria-label="Filter by account status"
                    onChange={(e) => setAccountStatus(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="all">All Statuses</option>

                    <option value="active">Active</option>

                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#351010] bg-[#141414]">
                  <table className="w-full min-w-237.5 text-left text-sm">
                    <thead className="bg-[#101010]">
                      <tr>
                        {[
                          "User",
                          "Email",
                          "Role",
                          "Subscription",
                          "Status",
                          "Actions",
                        ].map((title) => (
                          <th key={title} className="p-5">
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredUsers.map((account, index) => {
                        const id = getId(account);

                        const isBlocked = account.isBlocked === true;

                        const protectedAccount =
                          account.role === "admin" || id === user.id;

                        const canChange =
                          !!id &&
                          !protectedAccount &&
                          !busy &&
                          !sectionErrors.users &&
                          typeof account.isBlocked === "boolean";

                        return (
                          <tr
                            key={id || index}
                            className="border-t border-[#351010]"
                          >
                            <td className="p-5">
                              <div className="flex items-center gap-3">
                                <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-[#1C0808]">
                                  {str(account.image) ? (
                                    <img
                                      src={str(account.image)}
                                      alt={str(account.name)}
                                      className="h-full w-full object-cover"
                                    />
                                  ) : (
                                    <UserRound
                                      size={19}
                                      className="text-[#FF4545]"
                                    />
                                  )}
                                </div>

                                <span className="font-semibold">
                                  {str(account.name)}
                                </span>
                              </div>
                            </td>

                            <td className="p-5">{str(account.email)}</td>

                            <td className="p-5 capitalize">
                              {str(account.role)}
                            </td>

                            <td className="p-5">
  {account.role === "vendor" ? (
    <Status value={str(account.subscriptionPlan).toLowerCase()} />
  ) : (
    <span className="text-gray-400">—</span>
  )}
</td>

                            <td className="p-5">
                              <Status
                                value={
                                  isBlocked
                                    ? "blocked"
                                    : account.isBlocked === false
                                      ? "active"
                                      : "unknown"
                                }
                              />
                            </td>

                            <td className="p-5">
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    setSelected({
                                      title: "User Details",

                                      fields: [
                                        ["Name", str(account.name)],
                                        ["Email", str(account.email)],
                                        ["Role", str(account.role)],
                                        [
                                          "Restaurant",
                                          str(account.businessName),
                                        ],
                                        [
                                          "Subscription",
                                          str(account.subscriptionPlan),
                                        ],
                                        [
                                          "Registered",
                                          formatDate(account.createdAt),
                                        ],
                                      ],
                                    })
                                  }
                                  className="flex items-center gap-2 rounded-lg border border-[#351010] px-3 py-2.5 font-semibold hover:border-[#E51B23]"
                                >
                                  <Eye size={15} />
                                  Details
                                </button>

                                {!protectedAccount ? (
                                  <button
                                    disabled={!canChange}
                                    onClick={() => changeBlockStatus(account)}
                                    className={`flex items-center gap-2 rounded-lg px-3 py-2.5 font-semibold disabled:opacity-40 ${
                                      isBlocked
                                        ? "bg-green-700 text-white"
                                        : "bg-[#C9151B] text-white"
                                    }`}
                                  >
                                    {isBlocked ? (
                                      <ShieldCheck size={15} />
                                    ) : (
                                      <ShieldBan size={15} />
                                    )}

                                    {isBlocked ? "Unblock" : "Block"}
                                  </button>
                                ) : (
                                  <span className="flex items-center gap-1 text-xs text-white/60">
                                    <ShieldOff size={14} />
                                    Protected
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {!sectionErrors.users && filteredUsers.length === 0 && (
                    <p className="p-12 text-center text-white/60">
                      No users found.
                    </p>
                  )}
                </div>

                <p className="mt-4 text-xs text-white/50">
                  Showing {filteredUsers.length} of {users.length} loaded users.
                </p>
              </>
            )}

            {/* MANAGE MENU ITEMS */}

            {tab === "menu" && (
              <>
                <h2 className="text-3xl font-bold">Manage Menu Items</h2>

                <p className="mt-3 text-sm text-white/70">
                  Review, approve, reject and delete menu items.
                </p>

                <div className="my-6 flex flex-wrap gap-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search menu items"
                    className={`${fieldClass} min-w-45 flex-1`}
                  />

                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="all">All Statuses</option>

                    <option value="pending">Pending</option>

                    <option value="approved">Approved</option>

                    <option value="rejected">Rejected</option>

                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                {!sectionErrors.menu && filteredItems.length === 0 && (
                  <div className="rounded-2xl border border-[#351010] bg-[#141414] p-12 text-center">
                    No menu items found.
                  </div>
                )}

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredItems.map((item, index) => {
                    const images = Array.isArray(item.images)
                      ? item.images
                      : [];

                    const image = str(images[0]);
                    const status = str(item.status);
                    const vendor = obj(item.vendor);

                    const disabled =
                      busy || !getId(item) || !!sectionErrors.menu;

                    return (
                      <motion.article
                        key={getId(item) || index}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col overflow-hidden rounded-2xl border border-[#351010] bg-[#141414]"
                      >
                        {image ? (
                          <img
                            src={image}
                            alt={str(item.itemName)}
                            loading="lazy"
                            className="aspect-4/3 w-full object-cover"
                          />
                        ) : (
                          <div className="grid aspect-4/3 place-items-center bg-[#101010]">
                            <Pizza size={50} className="text-[#E51B23]" />
                          </div>
                        )}

                        <div className="flex flex-1 flex-col p-5">
                          <div className="flex items-center justify-between">
                            <Status value={status} />

                            <button
                              aria-label="View menu details"
                              onClick={() =>
                                setSelected({
                                  title: "Menu Item Details",

                                  fields: [
                                    ["Item", str(item.itemName)],
                                    ["Category", str(item.category)],
                                    [
                                      "Vendor",
                                      str(vendor.businessName) ||
                                        str(vendor.name) ||
                                        str(item.vendorName),
                                    ],
                                    ["Price", formatPrice(item.price)],
                                    ["Location", str(item.location)],
                                    ["Status", status],
                                    ["Description", str(item.description)],
                                    ["Created", formatDate(item.createdAt)],
                                  ],
                                })
                              }
                              className="rounded-lg border border-[#351010] p-2.5 hover:border-[#E51B23]"
                            >
                              <Eye size={17} />
                            </button>
                          </div>

                          <h3 className="mt-4 text-xl font-bold">
                            {str(item.itemName)}
                          </h3>

                          <p className="mt-2 text-sm text-white/70">
                            {str(item.category)}
                          </p>

                          <p className="mt-3 text-2xl font-bold text-[#FF4545]">
                            {formatPrice(item.price)}
                          </p>

                          <p className="mt-3 line-clamp-3 text-sm leading-6">
                            {str(item.description)}
                          </p>

                          <p className="mt-3 text-xs text-white/70">
                            {str(item.location)}
                          </p>

                          <div className="mt-auto pt-5">
                            <div className="grid grid-cols-2 gap-3 border-t border-[#351010] pt-5">
                              <button
                                disabled={disabled || status === "approved"}
                                onClick={() =>
                                  updateMenuStatus(item, "approved")
                                }
                                className="flex items-center justify-center gap-2 rounded-lg bg-green-700 py-3 text-sm font-bold disabled:opacity-40"
                              >
                                <CheckCircle size={16} />
                                Approve
                              </button>

                              <button
                                disabled={disabled || status === "rejected"}
                                onClick={() =>
                                  updateMenuStatus(item, "rejected")
                                }
                                className="flex items-center justify-center gap-2 rounded-lg bg-[#C9151B] py-3 text-sm font-bold disabled:opacity-40"
                              >
                                <XCircle size={16} />
                                Reject
                              </button>

                              <button
                                disabled={disabled}
                                onClick={() => deleteMenuItem(item)}
                                className="col-span-2 flex items-center justify-center gap-2 rounded-lg border border-[#E51B23] py-3 text-sm font-bold text-[#FF4545] hover:bg-[#1C0808] disabled:opacity-40"
                              >
                                <Trash2 size={16} />
                                Delete Menu Item
                              </button>
                            </div>
                          </div>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>
              </>
            )}

            {/* ALL ORDERS */}

            {tab === "orders" && (
              <>
                <h2 className="text-3xl font-bold">All Orders</h2>

                <p className="mt-3 text-sm text-white/70">
                  Monitor customer orders across all restaurants. Order records
                  are read-only.
                </p>

                <div className="my-6 flex flex-wrap gap-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search order, customer, vendor or address"
                    className={`${fieldClass} min-w-55 flex-1`}
                  />

                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    {
                      label: "Total Orders",
                      value: orders.length,
                    },
                    {
                      label: "Pending",
                      value: orders.filter(
                        (order) => str(order.status) === "pending",
                      ).length,
                    },
                    {
                      label: "Accepted",
                      value: orders.filter(
                        (order) => str(order.status) === "accepted",
                      ).length,
                    },
                    {
                      label: "Rejected / Cancelled",
                      value: orders.filter((order) =>
                        ["rejected", "cancelled"].includes(str(order.status)),
                      ).length,
                    },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl border border-[#351010] bg-[#141414] p-4"
                    >
                      <p className="text-xs text-white/60">{stat.label}</p>

                      <p className="mt-2 text-2xl font-bold">{stat.value}</p>
                    </div>
                  ))}
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#351010] bg-[#141414]">
                  <table className="w-full min-w-275 text-left text-sm">
                    <thead className="bg-[#101010]">
                      <tr>
                        {[
                          "Order",
                          "Menu Item",
                          "Customer",
                          "Restaurant",
                          "Delivery",
                          "Status",
                          "Order Date",
                        ].map((title) => (
                          <th key={title} className="p-5">
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredOrders.map((order, index) => {
                        const menuItem = obj(order.menuItem);
                        const customer = obj(order.customer);
                        const vendor = obj(order.vendor);

                        const images = Array.isArray(menuItem.images)
                          ? menuItem.images
                          : [];

                        const image = str(images[0]);

                        const status = str(order.status) || "pending";

                        return (
                          <tr
                            key={getId(order) || index}
                            className="border-t border-[#351010] align-top hover:bg-white/2"
                          >
                            <td className="p-5">
                              <p className="font-semibold">
                                #{getId(order).slice(-8) || "N/A"}
                              </p>

                              <p className="mt-1 text-xs text-white/40">
                                {str(order.itemId).slice(-8)}
                              </p>
                            </td>

                            <td className="p-5">
                              <div className="flex items-center gap-3">
                                {image ? (
                                  <img
                                    src={image}
                                    alt={str(menuItem.itemName) || "Menu item"}
                                    className="h-12 w-12 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="grid h-12 w-12 place-items-center rounded-lg bg-white/10">
                                    <Pizza size={20} />
                                  </div>
                                )}

                                <div>
                                  <p className="font-semibold">
                                    {str(menuItem.itemName) ||
                                      "Unavailable item"}
                                  </p>

                                  <p className="mt-1 text-xs text-white/50">
                                    {str(menuItem.category)}
                                  </p>

                                  <p className="mt-1 text-xs text-white/70">
                                    {formatPrice(menuItem.price)}
                                  </p>
                                </div>
                              </div>
                            </td>

                            <td className="p-5">
                              <p className="font-semibold">
                                {str(customer.name) || "Customer unavailable"}
                              </p>

                              <p className="mt-1 text-xs text-white/50">
                                {str(customer.email) || "No email"}
                              </p>
                            </td>

                            <td className="p-5">
                              <p className="font-semibold">
                                {str(vendor.businessName) ||
                                  str(vendor.name) ||
                                  "Restaurant unavailable"}
                              </p>

                              <p className="mt-1 text-xs text-white/50">
                                {str(vendor.email) || "No email"}
                              </p>
                            </td>

                            <td className="max-w-57.5 p-5">
                              <p className="font-medium">
                                {formatDate(order.deliveryDate)}
                              </p>

                              <p className="mt-1 whitespace-normal text-xs text-white/60">
                                {str(order.deliveryAddress) ||
                                  "No delivery address"}
                              </p>

                              {str(order.message) && (
                                <p className="mt-2 whitespace-normal text-xs text-white/40">
                                  Note: {str(order.message)}
                                </p>
                              )}
                            </td>

                            <td className="p-5">
                              <Status value={status} />
                            </td>

                            <td className="whitespace-nowrap p-5 text-white/60">
                              {formatDate(order.createdAt)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {!sectionErrors.orders && filteredOrders.length === 0 && (
                    <p className="p-12 text-center text-white/60">
                      No orders found.
                    </p>
                  )}
                </div>

                <p className="mt-4 text-xs text-white/40">
                  Admin access is read-only. Vendors remain responsible for
                  accepting or rejecting their own orders.
                </p>
              </>
            )}
            {/* TRANSACTIONS */}

            {tab === "transactions" && (
              <>
                <h2 className="text-3xl font-bold">Transactions</h2>

                <p className="mt-3 text-sm text-white/70">
                  View vendor subscription payments. Payment records are
                  read-only.
                </p>

                <div className="my-6 flex flex-wrap gap-3">
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search vendor"
                    className={`${fieldClass} min-w-45 flex-1`}
                  />

                  <select
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className={fieldClass}
                  >
                    <option value="all">All Statuses</option>

                    {Array.from(
                      new Set(
                        transactions
                          .map(
                            (transaction) =>
                              str(transaction.paymentStatus) ||
                              str(transaction.status),
                          )
                          .filter(Boolean),
                      ),
                    ).map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-[#351010] bg-[#141414]">
                  <table className="w-full min-w-187.5 text-left text-sm">
                    <thead className="bg-[#101010]">
                      <tr>
                        {[
                          "Vendor",
                          "Plan",
                          "Recorded Amount",
                          "Status",
                          "Date",
                        ].map((title) => (
                          <th key={title} className="p-5">
                            {title}
                          </th>
                        ))}
                      </tr>
                    </thead>

                    <tbody>
                      {filteredTransactions.map((transaction, index) => {
                        const vendor = obj(transaction.vendor);

                        const currency = str(transaction.currency);

                        return (
                          <tr
                            key={getId(transaction) || index}
                            className="border-t border-[#351010]"
                          >
                            <td className="p-5">
                              <p className="font-semibold">
                                {str(vendor.businessName) ||
                                  str(vendor.name) ||
                                  str(transaction.vendorName) ||
                                  str(transaction.vendorId) ||
                                  "Unavailable"}
                              </p>

                              <p className="mt-1 text-xs text-white/60">
                                {str(vendor.email) ||
                                  str(transaction.vendorEmail)}
                              </p>
                            </td>

                            <td className="p-5 capitalize">
                              {str(transaction.plan) ||
                                str(transaction.subscriptionPlan)}
                            </td>

                            <td className="p-5 font-bold text-[#FF4545]">
                              {typeof transaction.amount === "number"
                                ? `${transaction.amount} ${currency.toUpperCase()}`
                                : "Unavailable"}
                            </td>

                            <td className="p-5">
                              <Status
                                value={
                                  str(transaction.paymentStatus) ||
                                  str(transaction.status)
                                }
                              />
                            </td>

                            <td className="p-5">
                              {formatDate(
                                transaction.createdAt ||
                                  transaction.transactionDate,
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>

                  {!sectionErrors.transactions &&
                    filteredTransactions.length === 0 && (
                      <p className="p-12 text-center text-white/60">
                        No transactions found.
                      </p>
                    )}
                </div>
              </>
            )}
          </main>

          <footer className="mt-10 border-t border-[#351010] p-7 text-center text-xs text-white/60">
            PizzaHub Admin Dashboard
          </footer>
        </div>

        {/* CONFIRMATION MODAL */}

        {confirmation && (
          <div className="fixed inset-0 z-90 flex items-center justify-center overflow-y-auto bg-black/80 p-5">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={confirmation.title}
              initial={{
                opacity: 0,
                scale: 0.95,
                y: 10,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              className="w-full max-w-md rounded-3xl border border-[#351010] bg-[#141414] p-8 text-center shadow-2xl"
            >
              <div
                className={`mx-auto grid h-20 w-20 place-items-center rounded-full ${
                  confirmation.destructive ? "bg-[#280808]" : "bg-green-500/10"
                }`}
              >
                {confirmation.destructive ? (
                  <AlertTriangle size={40} className="text-[#FF4545]" />
                ) : (
                  <ShieldCheck size={40} className="text-green-400" />
                )}
              </div>

              <h2 className="mt-6 text-2xl font-bold">{confirmation.title}</h2>

              <p className="mt-4 text-sm leading-7 text-white/75">
                {confirmation.message}
              </p>

              <div className="mt-8 grid grid-cols-2 gap-3">
                <button
                  disabled={processing}
                  onClick={() => setConfirmation(null)}
                  className="rounded-xl border border-[#351010] bg-[#080808] px-4 py-3.5 text-sm font-semibold"
                >
                  Cancel
                </button>

                <button
                  disabled={processing}
                  onClick={executeAction}
                  className={`flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-sm font-bold disabled:opacity-50 ${
                    confirmation.destructive ? "bg-[#C9151B]" : "bg-green-700"
                  }`}
                >
                  {processing ? (
                    <>
                      <LoaderCircle size={17} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    confirmation.label
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* DETAILS MODAL */}

        {selected && (
          <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/80 p-5">
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label={selected.title}
              initial={{
                opacity: 0,
                scale: 0.96,
              }}
              animate={{
                opacity: 1,
                scale: 1,
              }}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#351010] bg-[#101010] p-7"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">{selected.title}</h2>

                <button
                  aria-label="Close details"
                  onClick={() => setSelected(null)}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="mt-6 space-y-3">
                {selected.fields.map(([label, value]) => (
                  <div
                    key={label}
                    className="rounded-xl border border-[#351010] bg-[#141414] p-4"
                  >
                    <p className="text-xs text-white/60">{label}</p>

                    <p className="mt-2 wrap-break-word text-sm font-semibold">
                      {value || "Not available"}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setSelected(null)}
                className="mt-6 w-full rounded-xl bg-[#C9151B] py-3.5 font-bold"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
