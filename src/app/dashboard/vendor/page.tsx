
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import { toast } from "sonner";

import {
  LayoutDashboard,
  Pizza,
  ShoppingBag,
  Clock,
  CheckCircle,
  XCircle,
  Crown,
  UserRound,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Store,
  MapPin,
  CalendarDays,
  RefreshCw,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

interface User {
  id: string;
  name: string;
  email: string;
  image?: string;
  role: string;
  businessName?: string;
  isBlocked?: boolean;
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
  createdAt: string;
}

interface OrderItem {
  itemName?: string;
  name?: string;
  price?: number;
  images?: string[];
  image?: string;
}

interface Order {
  _id: string;
  status: string;
  deliveryDate: string;
  deliveryAddress: string;
  message?: string;
  createdAt: string;

  itemSnapshot?: OrderItem;
  menuItem?: OrderItem;

  customer?: {
    name?: string;
    email?: string;
    image?: string;
  };

  customerName?: string;
  customerEmail?: string;
}

type Tab =
  | "overview"
  | "menu"
  | "orders"
  | "subscription";

function formatPrice(price: number) {
  return `\u09F3${price.toLocaleString("en-BD")}`;
}

function formatDate(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function statusClass(status: string) {
  switch (status.toLowerCase()) {
    case "approved":
    case "accepted":
    case "premium":
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
    throw new Error("Unable to verify authentication.");
  }

  return result.token as string;
}

async function apiRequest(
  endpoint: string,
  token: string,
  options: RequestInit = {}
) {
  const response = await fetch(
    `${API}${endpoint}`,
    {
      ...options,

      credentials: "include",
      cache: "no-store",

      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    }
  );

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

function FoodImage({
  src,
  name,
  className = "",
}: {
  src?: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`grid place-items-center bg-[#101010] ${className}`}
      >
        <Pizza
          size={36}
          className="text-[#E51B23]"
        />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}

export default function VendorDashboard() {
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

  const [user, setUser] = useState<User | null>(null);

  const [items, setItems] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  const [tab, setTab] = useState<Tab>("overview");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [mobileMenu, setMobileMenu] = useState(false);

  const [error, setError] = useState("");
  const [accessDenied, setAccessDenied] = useState(false);

  const [orderFilter, setOrderFilter] = useState("all");
  const [menuFilter, setMenuFilter] = useState("all");

  const [processing, setProcessing] = useState("");

  const [selectedOrder, setSelectedOrder] =
    useState<Order | null>(null);

  // =====================================
  // LOAD VENDOR DATA
  // =====================================

  async function loadVendorData(signal?: AbortSignal) {
    const token = await getToken(signal);

    const [menuResult, orderResult] = await Promise.all([
      apiRequest(
        "/api/menu/vendor/my-items",
        token,
        { signal }
      ),

      apiRequest(
        "/api/orders/vendor/my-orders",
        token,
        { signal }
      ),
    ]);

    if (
      !Array.isArray(menuResult?.data) ||
      !Array.isArray(orderResult?.data)
    ) {
      throw new Error("Unexpected vendor API response.");
    }

    if (signal?.aborted) return;

    setItems(menuResult.data);
    setOrders(orderResult.data);
  }

  // =====================================
  // ROLE VERIFICATION
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
          throw new Error("Unable to verify session.");
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
          setAccessDenied(true);
          return;
        }

        setUser(session.user);

        await loadVendorData(controller.signal);

      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load dashboard."
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
    if (refreshing || processing) return;

    try {
      setRefreshing(true);
      setError("");

      await loadVendorData();

      toast.success("Dashboard updated.");

    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Refresh failed.";

      setError(message);
      toast.error(message);

    } finally {
      setRefreshing(false);
    }
  }

  // =====================================
  // ACCEPT / REJECT CUSTOMER ORDER
  // =====================================

  async function updateOrder(
    order: Order,
    status: "accepted" | "rejected"
  ) {
    if (processing || refreshing) return;

    const current = orders.find(
      item => item._id === order._id
    );

    if (!current || current.status !== "pending") {
      toast.error("Only pending orders can be updated.");
      return;
    }

    const confirmed = window.confirm(
      status === "accepted"
        ? "Accept this customer order?"
        : "Reject this customer order?"
    );

    if (!confirmed) return;

    try {
      setProcessing(order._id);

      const token = await getToken();

      await apiRequest(
        `/api/orders/vendor/${encodeURIComponent(
          order._id
        )}/status`,
        token,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        }
      );

      setOrders(previous =>
        previous.map(item =>
          item._id === order._id
            ? { ...item, status }
            : item
        )
      );

      setSelectedOrder(previous =>
        previous?._id === order._id
          ? { ...previous, status }
          : previous
      );

      toast.success(
        status === "accepted"
          ? "Order accepted successfully."
          : "Order rejected successfully."
      );

      try {
        await loadVendorData();
      } catch {
        toast.error(
          "Order updated. Refresh to load the latest data."
        );
      }

    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Order update failed."
      );

    } finally {
      setProcessing("");
    }
  }

  // =====================================
  // LOGOUT
  // =====================================

  async function logout() {
    try {
      const response = await fetch(
        `${API}/api/auth/sign-out`,
        {
          method: "POST",
          credentials: "include",

          headers: {
            "Content-Type": "application/json",
          },

          body: "{}",
        }
      );

      if (!response.ok) {
        throw new Error("Logout failed.");
      }

      toast.success("Signed out successfully.");

      window.location.assign("/sign-in");

    } catch {
      toast.error("Unable to sign out.");
    }
  }

  // =====================================
  // DASHBOARD DATA
  // =====================================

  const activeItems = items.filter(
    item =>
      item.status === "approved" &&
      item.isActive !== false
  );

  const pendingOrders = orders.filter(
    order => order.status === "pending"
  );

  const acceptedOrders = orders.filter(
    order => order.status === "accepted"
  );

  const stats = [
    {
      title: "Total Menu Items",
      value: items.length,
      icon: Pizza,
      color: "text-[#FF4545]",
    },
    {
      title: "Active Menu Items",
      value: activeItems.length,
      icon: CheckCircle,
      color: "text-green-400",
    },
    {
      title: "Pending Orders",
      value: pendingOrders.length,
      icon: Clock,
      color: "text-amber-400",
    },
    {
      title: "Accepted Orders",
      value: acceptedOrders.length,
      icon: ShoppingBag,
      color: "text-green-400",
    },
  ];

  const isPremium =
    user?.subscriptionPlan === "premium" &&
    !!user.subscriptionExpiresAt &&
    new Date(user.subscriptionExpiresAt).getTime() >
      clockNow;

  const filteredMenu = items.filter(
    item =>
      menuFilter === "all" ||
      item.status === menuFilter
  );

  const sortedOrders = [...orders].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  const filteredOrders = sortedOrders.filter(
    order =>
      orderFilter === "all" ||
      order.status === orderFilter
  );

  const navigation = [
    {
      id: "overview" as const,
      title: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "menu" as const,
      title: "My Menu Items",
      icon: Pizza,
    },
    {
      id: "orders" as const,
      title: "Customer Orders",
      icon: ShoppingBag,
    },
    {
      id: "subscription" as const,
      title: "Subscription",
      icon: Crown,
    },
  ];

  function changeTab(value: Tab) {
    setTab(value);
    setMobileMenu(false);
  }

  // =====================================
  // LOADING STATE
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
            Loading vendor dashboard...
          </p>
        </div>
      </main>
    );
  }

  // =====================================
  // ACCESS DENIED
  // =====================================

  if (accessDenied || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white">
        <div className="max-w-md text-center">

          <ShieldCheck
            size={60}
            className="mx-auto text-[#E51B23]"
          />

          <h1 className="mt-5 text-3xl font-bold">
            {accessDenied
              ? "Access Denied"
              : "Dashboard Unavailable"}
          </h1>

          <p className="mt-4 leading-7">
            {accessDenied
              ? "Only active vendor accounts can access this dashboard."
              : error || "Please sign in."}
          </p>

          <Link
            href={accessDenied ? "/" : "/sign-in"}
            className="mt-7 inline-flex rounded-xl bg-[#C9151B] px-7 py-3 font-bold"
          >
            {accessDenied ? "Back to Home" : "Sign In"}
          </Link>

        </div>
      </main>
    );
  }

  // =====================================
  // DASHBOARD UI
  // =====================================

  return (
    <MotionConfig reducedMotion="user">

      <div className="min-h-screen bg-[#080808] text-white">

        {/* MOBILE OVERLAY */}

        {mobileMenu && (
          <button
            aria-label="Close sidebar"
            onClick={() => setMobileMenu(false)}
            className="fixed inset-0 z-40 bg-black/80 lg:hidden"
          />
        )}

        {/* SIDEBAR */}

        <aside
          className={`fixed inset-y-0 left-0 z-50 flex w-63.75 flex-col border-r border-[#351010] bg-[#101010] transition-transform duration-300 lg:translate-x-0 ${
            mobileMenu
              ? "translate-x-0"
              : "-translate-x-full"
          }`}
        >

          {/* LOGO */}

          <div className="flex h-24 items-center justify-between px-6">

            <Link
              href="/"
              className="flex items-center gap-3"
            >
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-[#C9151B] font-serif text-3xl font-bold italic ph-brand-mark">
                P
              </span>

              <span className="font-serif text-2xl font-bold">
                Pizza
                <span className="text-[#E51B23]">
                  Hub.
                </span>
              </span>
            </Link>

            <button
              aria-label="Close sidebar"
              onClick={() => setMobileMenu(false)}
              className="lg:hidden"
            >
              <X size={23} />
            </button>

          </div>

          {/* VENDOR PROFILE */}

          <div className="mx-4 rounded-xl border border-[#351010] bg-[#141414] p-4">

            <div className="flex items-center gap-3">

              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#C9151B]">
                  <Store size={24} />
                </div>
              )}

              <div className="min-w-0">

                <p className="truncate text-sm font-bold">
                  {user.businessName || user.name}
                </p>

                <p className="mt-1 text-xs text-[#FF4545]">
                  Restaurant Vendor
                </p>

              </div>

            </div>

            <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#351010] p-3 text-xs font-bold uppercase">

              <Crown
                size={17}
                className="text-[#E51B23]"
              />

              {isPremium ? "Premium Plan" : "Free Plan"}

            </div>

          </div>

          {/* NAVIGATION */}

          <nav className="mt-7 flex-1 space-y-2 overflow-y-auto px-4">

            <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-white/60">
              Restaurant Management
            </p>

            {navigation.map(item => (

              <button
                key={item.id}
                aria-current={
                  tab === item.id ? "page" : undefined
                }
                onClick={() => changeTab(item.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold transition ${
                  tab === item.id
                    ? "bg-[#C9151B] text-white"
                    : "hover:bg-[#1C0808]"
                }`}
              >
                <item.icon size={20} />

                {item.title}
              </button>

            ))}


<Link
  href="/dashboard/vendor/menu"
  className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-[#1C0808]"
>
  <Pizza size={20} />
  Add Menu Item
</Link>


<Link
  href="/dashboard/vendor/subscription"
  className="flex w-full items-center gap-3 rounded-xl border border-[#351010] px-4 py-3.5 text-sm font-semibold text-[#FF4545] hover:border-[#E51B23]"
>
  <Crown size={20} />
  Manage Subscription
</Link>

<Link
              href="/profile"
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-[#1C0808]"
            >
              <Settings size={20} />
              Profile Settings
            </Link>

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
              className="flex w-full items-center gap-3 rounded-xl px-4 py-4 font-semibold text-[#FF4545] hover:bg-[#1C0808]"
            >
              <LogOut size={20} />

              Sign Out
            </button>

          </div>

        </aside>

        {/* MAIN DASHBOARD */}

        <div className="lg:ml-63.75">

          {/* HEADER */}

          <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-[#351010] bg-[#0B0B0B] px-5 lg:px-8">

            <div className="flex items-center gap-4">

              <button
                aria-label="Open sidebar"
                onClick={() => setMobileMenu(true)}
                className="lg:hidden"
              >
                <Menu size={24} />
              </button>

              <h1 className="text-lg font-bold sm:text-xl">

                {tab === "overview"
                  ? "Vendor Dashboard"
                  : navigation.find(
                      item => item.id === tab
                    )?.title}

              </h1>

            </div>

            <button
              onClick={refresh}
              disabled={refreshing || !!processing}
              className="flex items-center gap-2 rounded-xl border border-[#351010] bg-[#141414] p-3 text-sm hover:border-[#E51B23]"
            >
              <RefreshCw
                size={18}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>
            </button>

          </header>

          <main className="mx-auto max-w-375 p-5 lg:p-8">

            {error && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-[#E51B23] bg-[#1C0808] p-5 text-[#FF7777]"
              >
                {error}
              </div>
            )}

            {/* OVERVIEW TAB */}

            {tab === "overview" && (

              <>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 rounded-2xl border border-[#351010] bg-[#141414] p-7 sm:p-9"
                >

                  <p className="text-sm font-bold tracking-widest text-[#FF4545]">
                    RESTAURANT CONTROL CENTER
                  </p>

                  <h2 className="mt-4 font-serif text-3xl font-bold sm:text-4xl">

                    Welcome, {user.businessName || user.name}!

                  </h2>

                  <p className="mt-4 text-sm leading-7 text-white/80">
                    Manage your restaurant, menu items
                    and customer orders in one place.
                  </p>

                  <div className="mt-6 flex flex-wrap gap-3">

                    <button
                      onClick={() => changeTab("menu")}
                      className="rounded-xl bg-[#C9151B] px-6 py-3.5 text-sm font-bold hover:bg-[#E51B23]"
                    >
                      My Menu Items
                    </button>

                    <button
                      onClick={() => changeTab("orders")}
                      className="rounded-xl border border-[#351010] bg-[#080808] px-6 py-3.5 text-sm font-bold hover:border-[#E51B23]"
                    >
                      Customer Orders
                    </button>

                  </div>

                </motion.div>

                {/* STATISTICS */}

                <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">

                  {stats.map((item, index) => (

                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.06,
                      }}
                      className="rounded-2xl border border-[#351010] bg-[#141414] p-5"
                    >

                      <item.icon
                        size={28}
                        className={item.color}
                      />

                      <p className="mt-5 text-xs sm:text-sm">
                        {item.title}
                      </p>

                      <p className="mt-2 text-4xl font-bold">
                        {error ? "-" : item.value}
                      </p>

                    </motion.div>

                  ))}

                </div>

                {/* CURRENT PLAN */}

                <section className="mt-8 rounded-2xl border border-[#351010] bg-[#141414] p-7">

                  <Crown
                    size={30}
                    className="text-[#E51B23]"
                  />

                  <h2 className="mt-4 text-2xl font-bold">

                    {isPremium
                      ? "Premium Subscription"
                      : "Free Subscription"}

                  </h2>

                  <p className="mt-3 text-sm text-white/70">

                    {isPremium
                      ? "Unlimited active menu items."
                      : `${activeItems.length} active menu items out of 3 allowed.`}

                  </p>

                  {!isPremium && (
                    <div className="mt-5 h-2 overflow-hidden rounded-full bg-[#351010]">

                      <div
                        className="h-full rounded-full bg-[#E51B23]"
                        style={{
                          width: `${Math.min(
                            activeItems.length / 3 * 100,
                            100
                          )}%`,
                        }}
                      />

                    </div>
                  )}

                  <button
                    onClick={() =>
                      changeTab("subscription")
                    }
                    className="mt-6 rounded-xl bg-[#C9151B] px-6 py-3 text-sm font-bold"
                  >
                    View Subscription
                  </button>

                </section>

                {/* RECENT ORDERS */}

                <section className="mt-8 rounded-2xl border border-[#351010] bg-[#101010] p-6">

                  <div className="flex items-center justify-between gap-3">

                    <h2 className="text-xl font-bold">
                      Recent Orders
                    </h2>

                    <button
                      onClick={() => changeTab("orders")}
                      className="text-sm font-bold text-[#FF4545]"
                    >
                      View All
                    </button>

                  </div>

                  {!error && sortedOrders.length === 0 && (
                    <p className="py-10 text-center text-sm text-white/60">
                      No customer orders yet.
                    </p>
                  )}

                  <div className="mt-5 space-y-3">

                    {sortedOrders.slice(0, 5).map(order => (

                      <button
                        key={order._id}
                        onClick={() =>
                          setSelectedOrder(order)
                        }
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-[#351010] bg-[#141414] p-4 text-left hover:border-[#E51B23]"
                      >

                        <div>

                          <p className="font-semibold">

                            {order.itemSnapshot?.itemName ||
                              order.menuItem?.itemName ||
                              order.itemSnapshot?.name ||
                              order.menuItem?.name ||
                              "Menu Item"}

                          </p>

                          <p className="mt-2 text-xs text-white/60">
                            {formatDate(order.createdAt)}
                          </p>

                        </div>

                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${statusClass(order.status)}`}
                        >
                          {order.status}
                        </span>

                      </button>

                    ))}

                  </div>

                </section>

              </>

            )}

            {/* MY MENU ITEMS TAB */}

            {tab === "menu" && (

              <>

                <div className="mb-7 flex flex-wrap items-center justify-between gap-4">

                  <div>

                    <h2 className="text-3xl font-bold">
                      My Menu Items
                    </h2>

                    <p className="mt-2 text-sm text-white/70">
                      {items.length} restaurant menu items
                    </p>

                  </div>

                  <select
                    aria-label="Filter menu status"
                    value={menuFilter}
                    onChange={e =>
                      setMenuFilter(e.target.value)
                    }
                    className="rounded-xl border border-[#351010] bg-[#141414] px-5 py-3 text-sm"
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

                </div>

                {!error && filteredMenu.length === 0 && (

                  <div className="rounded-2xl border border-[#351010] bg-[#141414] py-20 text-center">

                    <Pizza
                      size={55}
                      className="mx-auto text-[#E51B23]"
                    />

                    <h3 className="mt-5 text-xl font-bold">
                      No menu items found
                    </h3>

                  </div>

                )}

                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">

                  {filteredMenu.map((item, index) => (

                    <motion.article
                      key={item._id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: Math.min(index * 0.05, 0.3),
                      }}
                      className="overflow-hidden rounded-2xl border border-[#351010] bg-[#141414]"
                    >

                      <div className="relative">

                        <FoodImage
                          key={item.images?.[0]}
                          src={item.images?.[0]}
                          name={item.itemName}
                          className="aspect-4/3 w-full"
                        />

                        <span className="absolute left-3 top-3 rounded-lg bg-black/90 px-3 py-2 text-xs font-bold">

                          {item.category}

                        </span>

                      </div>

                      <div className="p-5">

                        <div className="flex items-start justify-between gap-3">

                          <h3 className="text-lg font-bold">

                            {item.itemName}

                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClass(item.status)}`}
                          >
                            {item.status}
                          </span>

                        </div>

                        <p className="mt-3 flex items-center gap-2 text-sm">

                          <MapPin
                            size={16}
                            className="text-[#E51B23]"
                          />

                          {item.location}

                        </p>

                        <p className="mt-4 text-2xl font-bold text-[#FF4545]">

                          {formatPrice(item.price)}

                        </p>

                        <p className="mt-3 text-sm leading-6 text-white/70">

                          {item.description}

                        </p>

                      </div>

                    </motion.article>

                  ))}

                </div>

              </>

            )}

            {/* CUSTOMER ORDERS TAB */}

            {tab === "orders" && (

              <>

                <div className="mb-7 flex flex-wrap items-center justify-between gap-4">

                  <h2 className="text-3xl font-bold">
                    Customer Orders
                  </h2>

                  <select
                    aria-label="Filter order status"
                    value={orderFilter}
                    onChange={e =>
                      setOrderFilter(e.target.value)
                    }
                    className="rounded-xl border border-[#351010] bg-[#141414] px-5 py-3 text-sm"
                  >

                    <option value="all">
                      All Orders
                    </option>

                    <option value="pending">
                      Pending
                    </option>

                    <option value="accepted">
                      Accepted
                    </option>

                    <option value="rejected">
                      Rejected
                    </option>

                    <option value="cancelled">
                      Cancelled
                    </option>

                  </select>

                </div>

                {!error && filteredOrders.length === 0 && (

                  <div className="rounded-2xl border border-[#351010] bg-[#141414] py-20 text-center">

                    <ShoppingBag
                      size={55}
                      className="mx-auto text-[#E51B23]"
                    />

                    <h3 className="mt-5 text-xl font-bold">
                      No orders found
                    </h3>

                  </div>

                )}

                <div className="space-y-5">

                  {filteredOrders.map(order => {

                    const item = {
                      ...order.menuItem,
                      ...order.itemSnapshot,
                    };

                    const itemName =
                      item.itemName ||
                      item.name ||
                      "Menu Item";

                    return (

                      <motion.article
                        key={order._id}
                        layout
                        className="rounded-2xl border border-[#351010] bg-[#141414] p-5 sm:p-6"
                      >

                        <div className="flex flex-wrap items-start gap-4">

                          <FoodImage
                            src={
                              item.images?.[0] ||
                              item.image
                            }
                            name={itemName}
                            className="h-24 w-28 rounded-xl"
                          />

                          <div className="min-w-0 flex-1">

                            <h3 className="text-lg font-bold">
                              {itemName}
                            </h3>

                            <p className="mt-2 flex items-center gap-2 text-sm">

                              <UserRound size={16} />

                              {order.customer?.name ||
                                order.customerName ||
                                "Customer name unavailable"}

                            </p>

                            <p className="mt-2 break-all text-xs text-white/60">

                              {order.customer?.email ||
                                order.customerEmail ||
                                ""}

                            </p>

                            {typeof item.price === "number" && (

                              <p className="mt-3 font-bold text-[#FF4545]">

                                {formatPrice(item.price)}

                              </p>

                            )}

                          </div>

                          <span
                            className={`rounded-full px-3 py-2 text-xs font-bold capitalize ${statusClass(order.status)}`}
                          >

                            {order.status}

                          </span>

                        </div>

                        <div className="mt-5 space-y-3 border-t border-[#351010] pt-5 text-sm">

                          <p className="flex items-start gap-2">

                            <CalendarDays
                              size={18}
                              className="shrink-0 text-[#E51B23]"
                            />

                            Delivery: {formatDate(order.deliveryDate)}

                          </p>

                          <p className="flex items-start gap-2">

                            <MapPin
                              size={18}
                              className="shrink-0 text-[#E51B23]"
                            />

                            {order.deliveryAddress}

                          </p>

                          {order.message && (
                            <p>
                              Message: {order.message}
                            </p>
                          )}

                        </div>

                        <div className="mt-6 flex flex-wrap gap-3">

                          <button
                            onClick={() =>
                              setSelectedOrder(order)
                            }
                            className="rounded-lg border border-[#351010] px-5 py-3 text-sm font-bold hover:border-[#E51B23]"
                          >
                            View Details
                          </button>

                          {order.status === "pending" && (

                            <>

                              <button
                                disabled={!!processing || refreshing}
                                onClick={() =>
                                  updateOrder(order, "accepted")
                                }
                                className="flex items-center gap-2 rounded-lg bg-[#15803D] px-5 py-3 text-sm font-bold disabled:opacity-50"
                              >

                                <CheckCircle size={18} />

                                {processing === order._id
                                  ? "Processing..."
                                  : "Accept Order"}

                              </button>

                              <button
                                disabled={!!processing || refreshing}
                                onClick={() =>
                                  updateOrder(order, "rejected")
                                }
                                className="flex items-center gap-2 rounded-lg bg-[#C9151B] px-5 py-3 text-sm font-bold disabled:opacity-50"
                              >

                                <XCircle size={18} />

                                Reject Order

                              </button>

                            </>

                          )}

                        </div>

                      </motion.article>

                    );
                  })}

                </div>

              </>

            )}

            {/* SUBSCRIPTION TAB */}

            {tab === "subscription" && (

              <>

                <h2 className="text-3xl font-bold">
                  Subscription Plans
                </h2>

                <p className="mt-3 text-sm text-white/70">
                  Manage your restaurant subscription.
                </p>

                <div className="mt-8 grid gap-6 md:grid-cols-2">

                  {[
                    {
                      name: "Free Plan",
                      current: !isPremium,
                      features: [
                        "Maximum 3 active menu items",
                        "Vendor dashboard access",
                        "Customer order management",
                        "Restaurant profile management",
                      ],
                    },

                    {
                      name: "Premium Plan",
                      current: isPremium,
                      features: [
                        "Unlimited active menu items",
                        "Premium vendor badge",
                        "Featured menu placement",
                        "All Free plan features",
                      ],
                    },
                  ].map(plan => (

                    <article
                      key={plan.name}
                      className={`rounded-2xl border bg-[#141414] p-7 ${
                        plan.current
                          ? "border-[#E51B23]"
                          : "border-[#351010]"
                      }`}
                    >

                      <Crown
                        size={35}
                        className="text-[#E51B23]"
                      />

                      <h3 className="mt-5 text-2xl font-bold">

                        {plan.name}

                      </h3>

                      {plan.current && (

                        <span className="mt-4 inline-block rounded-full bg-[#C9151B] px-4 py-2 text-xs font-bold">

                          Current Plan

                        </span>

                      )}

                      <div className="mt-7 space-y-4">

                        {plan.features.map(feature => (

                          <div
                            key={feature}
                            className="flex items-start gap-3 text-sm"
                          >

                            <CheckCircle
                              size={19}
                              className="shrink-0 text-[#FF4545]"
                            />

                            {feature}

                          </div>

                        ))}

                      </div>

                      {plan.name === "Premium Plan" &&
                        plan.current && (

                          <p className="mt-7 border-t border-[#351010] pt-5 text-sm">

                            Expires:{" "}
                            {formatDate(
                              user.subscriptionExpiresAt
                            )}

                          </p>

                        )}

                    </article>

                  ))}

                </div>

              </>

            )}

          </main>

          <footer className="mt-10 border-t border-[#351010] px-5 py-7 text-center text-xs text-white/60">

            PizzaHub Vendor Dashboard

          </footer>

        </div>

        {/* ORDER DETAILS */}

        {selectedOrder && (

          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4">

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Customer order details"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#351010] bg-[#101010] p-7"
            >

              <div className="flex items-center justify-between gap-4">

                <h2 className="text-2xl font-bold">
                  Order Details
                </h2>

                <button
                  aria-label="Close order details"
                  onClick={() => setSelectedOrder(null)}
                >
                  <X size={24} />
                </button>

              </div>

              <div className="mt-7 space-y-5 text-sm">

                {[
                  {
                    label: "Order ID",
                    value: selectedOrder._id,
                  },
                  {
                    label: "Menu Item",
                    value:
                      selectedOrder.itemSnapshot?.itemName ||
                      selectedOrder.menuItem?.itemName ||
                      selectedOrder.itemSnapshot?.name ||
                      selectedOrder.menuItem?.name ||
                      "Not available",
                  },
                  {
                    label: "Customer",
                    value:
                      selectedOrder.customer?.name ||
                      selectedOrder.customerName ||
                      "Not available",
                  },
                  {
                    label: "Email",
                    value:
                      selectedOrder.customer?.email ||
                      selectedOrder.customerEmail ||
                      "Not available",
                  },
                  {
                    label: "Delivery Date",
                    value: formatDate(
                      selectedOrder.deliveryDate
                    ),
                  },
                  {
                    label: "Delivery Address",
                    value: selectedOrder.deliveryAddress,
                  },
                  {
                    label: "Customer Message",
                    value:
                      selectedOrder.message ||
                      "No message",
                  },
                  {
                    label: "Request Date",
                    value: formatDate(
                      selectedOrder.createdAt
                    ),
                  },
                  {
                    label: "Order Status",
                    value: selectedOrder.status,
                  },
                ].map(field => (

                  <div
                    key={field.label}
                    className="rounded-lg border border-[#351010] bg-[#141414] p-4"
                  >

                    <p className="text-xs text-white/60">

                      {field.label}

                    </p>

                    <p className="mt-2 wrap-break-word font-semibold">

                      {field.value}

                    </p>

                  </div>

                ))}

              </div>

              <button
                onClick={() => setSelectedOrder(null)}
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
