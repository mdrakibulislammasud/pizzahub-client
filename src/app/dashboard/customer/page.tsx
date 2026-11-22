
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, MotionConfig } from "motion/react";
import { toast } from "sonner";

import {
  LayoutDashboard,
  ShoppingBag,
  Clock3,
  CheckCircle2,
  XCircle,
  Pizza,
  LogOut,
  Menu,
  X,
  MapPin,
  CalendarDays,
  UserRound,
  ArrowRight,
  LoaderCircle,
  Store,
  RefreshCw,
  Home,
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
  isBlocked?: boolean;
}

interface Item {
  itemName?: string;
  name?: string;
  price?: number;
  images?: string[];
  image?: string;
}

interface Order {
  _id: string;
  itemId: string;
  status: string;
  deliveryDate: string;
  deliveryAddress: string;
  message?: string;
  createdAt: string;

  // Quantity and total price
  quantity?: number;
  totalPrice?: number;

  itemSnapshot?: Item;
  menuItem?: Item;

  vendor?: {
    name?: string;
    businessName?: string;
    email?: string;
  };
}


type Tab = "overview" | "orders";

function formatPrice(price: number) {
  return `\u09F3${price.toLocaleString("en-BD")}`;
}

function formatDate(value: string) {
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

function getItem(order: Order): Item {
  return {
    ...order.menuItem,
    ...order.itemSnapshot,
  };
}

function getStatusClass(status: string) {
  switch (status.toLowerCase()) {
    case "accepted":
      return "bg-green-500/10 text-green-400";
    case "pending":
      return "bg-amber-500/10 text-amber-400";
    case "rejected":
      return "bg-red-500/10 text-red-400";
    case "cancelled":
      return "bg-white/10 text-white";
    default:
      return "bg-white/10 text-white";
  }
}

async function getToken() {
  const response = await fetch(
    `${API}/api/auth/token`,
    {
      credentials: "include",
      cache: "no-store",
    }
  );

  if (response.status === 401) {
    window.location.assign("/sign-in");
    throw new Error("Session expired.");
  }

  const result = await response.json();

  if (!response.ok || !result.token) {
    throw new Error("Unable to verify session.");
  }

  return result.token as string;
}

async function fetchOrders(signal?: AbortSignal) {
  const token = await getToken();

  const response = await fetch(
    `${API}/api/orders/my-orders`,
    {
      credentials: "include",
      cache: "no-store",
      signal,

      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const result = await response.json();

  if (
    !response.ok ||
    !result.success ||
    !Array.isArray(result.data)
  ) {
    throw new Error(
      result.message || "Unable to load orders."
    );
  }

  return result.data as Order[];
}

function OrderImage({
  item,
}: {
  item: Item;
}) {
  const [failed, setFailed] = useState(false);
  const image = item.images?.[0] || item.image;

  if (!image || failed) {
    return (
      <div className="grid h-20 w-24 shrink-0 place-items-center rounded-xl bg-[#080808]">
        <Pizza
          size={32}
          className="text-[#E51B23]"
        />
      </div>
    );
  }

  return (
    <img
      src={image}
      alt={item.itemName || item.name || "Pizza"}
      onError={() => setFailed(true)}
      className="h-20 w-24 shrink-0 rounded-xl object-cover"
    />
  );
}

export default function CustomerDashboard() {
  const [user, setUser] = useState<User | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);

  const [tab, setTab] = useState<Tab>("overview");

  const [filter, setFilter] = useState("all");

  const [loading, setLoading] = useState(true);

  const [refreshing, setRefreshing] = useState(false);

  const [accessDenied, setAccessDenied] = useState(false);

  const [mobileMenu, setMobileMenu] = useState(false);

  const [error, setError] = useState("");

  const [selected, setSelected] =
    useState<Order | null>(null);

  const [cancelTarget, setCancelTarget] =
    useState<Order | null>(null);

  const [cancelling, setCancelling] = useState(false);

  // ======================================
  // AUTHENTICATION AND ROLE VERIFICATION
  // ======================================

  useEffect(() => {
    const controller = new AbortController();

    async function initialize() {
      try {
        const response = await fetch(
          `${API}/api/auth/get-session`,
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

        if (!session?.user) {
          window.location.assign("/sign-in");
          return;
        }

        if (
          session.user.role !== "customer" ||
          session.user.isBlocked
        ) {
          setAccessDenied(true);
          return;
        }

        if (controller.signal.aborted) return;

        setUser(session.user);

        const data = await fetchOrders(
          controller.signal
        );

        if (!controller.signal.aborted) {
          setOrders(data);
        }

      } catch (err) {
        if (!controller.signal.aborted) {
          setError(
            err instanceof Error
              ? err.message
              : "Something went wrong."
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

  // ======================================
  // REFRESH ORDERS
  // ======================================

  async function refreshOrders() {
    try {
      setRefreshing(true);
      setError("");

      const data = await fetchOrders();

      setOrders(data);

    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Unable to refresh orders."
      );
    } finally {
      setRefreshing(false);
    }
  }

  // ======================================
  // CANCEL PENDING ORDER
  // ======================================

  async function cancelOrder() {
    if (!cancelTarget || cancelling) return;

    const current = orders.find(
      order => order._id === cancelTarget._id
    );

    if (!current || current.status !== "pending") {
      toast.error(
        "Only pending orders can be cancelled."
      );

      setCancelTarget(null);
      return;
    }

    try {
      setCancelling(true);

      const token = await getToken();

      const response = await fetch(
        `${API}/api/orders/${encodeURIComponent(
          current._id
        )}/cancel`,
        {
          method: "PATCH",
          credentials: "include",

          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },

          body: JSON.stringify({}),
        }
      );

      const result = await response.json()
        .catch(() => null);

      if (
        !response.ok ||
        result?.success === false
      ) {
        throw new Error(
          result?.message ||
          "Unable to cancel order."
        );
      }

      setOrders(previous =>
        previous.map(order =>
          order._id === current._id
            ? { ...order, status: "cancelled" }
            : order
        )
      );

      setSelected(null);
      setCancelTarget(null);

      toast.success(
        "Order cancelled successfully."
      );

      await refreshOrders();

    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Cancellation failed."
      );
    } finally {
      setCancelling(false);
    }
  }

  // ======================================
  // LOGOUT
  // ======================================

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

  // ======================================
  // DASHBOARD STATISTICS
  // ======================================

  const stats = [
    {
      title: "Total Orders",
      value: orders.length,
      icon: ShoppingBag,
      color: "text-[#FF4545]",
    },
    {
      title: "Pending Orders",
      value: orders.filter(
        order => order.status === "pending"
      ).length,
      icon: Clock3,
      color: "text-amber-400",
    },
    {
      title: "Accepted Orders",
      value: orders.filter(
        order => order.status === "accepted"
      ).length,
      icon: CheckCircle2,
      color: "text-green-400",
    },
    {
      title: "Rejected Orders",
      value: orders.filter(
        order => order.status === "rejected"
      ).length,
      icon: XCircle,
      color: "text-red-400",
    },
  ];

  const sortedOrders = [...orders].sort(
    (a, b) =>
      new Date(b.createdAt).getTime() -
      new Date(a.createdAt).getTime()
  );

  const filteredOrders = sortedOrders.filter(
    order =>
      filter === "all" ||
      order.status === filter
  );

  const visibleOrders =
    tab === "overview"
      ? sortedOrders.slice(0, 4)
      : filteredOrders;

  function changeTab(value: Tab) {
    setTab(value);
    setMobileMenu(false);
  }

  // ======================================
  // LOADING STATE
  // ======================================

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080808] text-white">

        <div className="text-center">

          <LoaderCircle
            size={40}
            className="mx-auto animate-spin text-[#E51B23]"
          />

          <p className="mt-5">
            Loading dashboard...
          </p>

        </div>

      </main>
    );
  }

  // ======================================
  // PROTECTED ROUTE
  // ======================================

  if (accessDenied || !user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white">

        <div className="max-w-md text-center">

          <XCircle
            size={60}
            className="mx-auto mb-5 text-[#E51B23]"
          />

          <h1 className="text-3xl font-bold">
            {accessDenied
              ? "Access Denied"
              : "Unable to Load Dashboard"}
          </h1>

          <p className="mt-4 leading-7">
            {accessDenied
              ? "This dashboard is only available to active customer accounts."
              : error || "Please sign in again."}
          </p>

          <Link
            href={accessDenied ? "/" : "/sign-in"}
            className="mt-7 inline-flex rounded-xl bg-[#C9151B] px-7 py-3 font-bold"
          >
            {accessDenied
              ? "Back to Home"
              : "Sign In"}
          </Link>

        </div>

      </main>
    );
  }

  return (
    <MotionConfig reducedMotion="user">

      <div className="min-h-screen bg-[#080808] text-white">

        {/* MOBILE OVERLAY */}

        {mobileMenu && (
          <button
            type="button"
            aria-label="Close sidebar"
            onClick={() => setMobileMenu(false)}
            className="fixed inset-0 z-40 bg-black/70 lg:hidden"
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
              type="button"
              aria-label="Close sidebar"
              onClick={() => setMobileMenu(false)}
              className="lg:hidden"
            >
              <X size={22} />
            </button>

          </div>

          {/* USER INFO */}

          <div className="mx-4 rounded-xl border border-[#351010] bg-[#141414] p-4">

            <div className="flex items-center gap-3">

              {user.image ? (
                <img
                  src={user.image}
                  alt=""
                  className="h-11 w-11 rounded-full object-cover"
                />
              ) : (
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#C9151B]">
                  <UserRound size={22} />
                </div>
              )}

              <div className="min-w-0">

                <p className="truncate text-sm font-bold">
                  {user.name}
                </p>

                <p className="mt-1 text-xs text-[#FF4545]">
                  Customer
                </p>

              </div>

            </div>

          </div>

          {/* NAVIGATION */}

          <nav className="mt-8 space-y-2 px-4">

            <p className="mb-4 px-3 text-xs font-semibold uppercase tracking-widest text-white/60">
              Dashboard
            </p>

            {[
              {
                id: "overview" as const,
                label: "Overview",
                icon: LayoutDashboard,
              },
              {
                id: "orders" as const,
                label: "My Orders",
                icon: ShoppingBag,
              },
            ].map(link => (
              <button
                key={link.id}
                type="button"
                onClick={() => changeTab(link.id)}
                aria-current={
                  tab === link.id ? "page" : undefined
                }
                className={`flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-left text-sm font-semibold transition ${
                  tab === link.id
                    ? "bg-[#C9151B] text-white"
                    : "hover:bg-[#1C0808]"
                }`}
              >
                <link.icon size={20} />

                {link.label}

              </button>
            ))}

            <Link
              href="/menu"
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-[#1C0808]"
            >
              <Pizza size={20} />

              Browse Menu
            </Link>

            <Link
              href="/"
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm font-semibold hover:bg-[#1C0808]"
            >
              <Home size={20} />

              Home
            </Link>

          </nav>

          {/* LOGOUT BUTTON */}

          <div className="mt-auto border-t border-[#351010] p-4">

            <button
              onClick={logout}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-4 text-sm font-semibold text-[#FF4545] hover:bg-[#1C0808]"
            >
              <LogOut size={20} />

              Sign Out
            </button>

          </div>

        </aside>

        {/* MAIN CONTENT */}

        <div className="lg:ml-63.75">

          {/* TOP HEADER */}

          <header className="sticky top-0 z-30 flex min-h-20 items-center justify-between gap-4 border-b border-[#351010] bg-[#0B0B0B] px-5 lg:px-8">

            <div className="flex items-center gap-4">

              <button
                type="button"
                aria-label="Open sidebar"
                onClick={() => setMobileMenu(true)}
                className="lg:hidden"
              >
                <Menu size={24} />
              </button>

              <h1 className="text-lg font-bold sm:text-xl">

                {tab === "overview"
                  ? "Customer Dashboard"
                  : "My Orders"}

              </h1>

            </div>

            <button
              onClick={refreshOrders}
              disabled={refreshing}
              className="flex items-center gap-2 rounded-lg border border-[#351010] bg-[#141414] p-3 text-sm hover:border-[#E51B23]"
            >
              <RefreshCw
                size={17}
                className={
                  refreshing ? "animate-spin" : ""
                }
              />

              <span className="hidden sm:inline">
                Refresh
              </span>

            </button>

          </header>

          <main className="mx-auto max-w-362.5 p-5 lg:p-8">

            {error && (
              <div
                role="alert"
                className="mb-6 rounded-xl border border-[#E51B23] bg-[#1C0808] p-5 text-[#FF7777]"
              >

                {error}

                <button
                  onClick={refreshOrders}
                  className="ml-4 underline"
                >
                  Try again
                </button>

              </div>
            )}

            {/* OVERVIEW */}

            {tab === "overview" && (

              <>

                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-8 rounded-2xl border border-[#351010] bg-[#141414] p-7 sm:p-9"
                >

                  <p className="text-sm font-semibold text-[#FF4545]">
                    YOUR PIZZAHUB ACCOUNT
                  </p>

                  <h2 className="mt-3 font-serif text-3xl font-bold sm:text-4xl">
                    Welcome, {user.name}!
                  </h2>

                  <p className="mt-4 text-sm leading-7 text-white/80">
                    Manage your orders and discover your
                    favourite pizzas.
                  </p>

                  <Link
                    href="/menu"
                    className="mt-6 inline-flex items-center gap-3 rounded-xl bg-[#C9151B] px-6 py-3.5 text-sm font-bold hover:bg-[#E51B23]"
                  >
                    Explore Menu

                    <ArrowRight size={18} />
                  </Link>

                </motion.div>

                {/* STATISTICS */}

                <div className="mb-9 grid grid-cols-2 gap-4 xl:grid-cols-4">

                  {stats.map((item, index) => (

                    <motion.div
                      key={item.title}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: index * 0.07,
                      }}
                      className="rounded-2xl border border-[#351010] bg-[#141414] p-5"
                    >

                      <item.icon
                        size={25}
                        className={item.color}
                      />

                      <p className="mt-5 text-xs font-medium sm:text-sm">
                        {item.title}
                      </p>

                      <p className="mt-2 text-3xl font-bold sm:text-4xl">
                        {error ? "-" : item.value}
                      </p>

                    </motion.div>

                  ))}

                </div>

              </>

            )}

            {/* ORDERS SECTION */}

            <section className="rounded-2xl border border-[#351010] bg-[#101010] p-5 sm:p-7">

              <div className="mb-6 flex flex-wrap items-center justify-between gap-4">

                <h2 className="text-2xl font-bold">
                  {tab === "overview"
                    ? "Recent Orders"
                    : "All Orders"}
                </h2>

                {tab === "overview" ? (

                  <button
                    onClick={() => changeTab("orders")}
                    className="flex items-center gap-2 text-sm font-bold text-[#FF4545]"
                  >
                    View All

                    <ArrowRight size={17} />
                  </button>

                ) : (

                  <select
                    aria-label="Filter order status"
                    value={filter}
                    onChange={e =>
                      setFilter(e.target.value)
                    }
                    className="rounded-lg border border-[#351010] bg-[#141414] px-4 py-3 text-sm"
                  >

                    <option value="all">
                      All Statuses
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
                )}

              </div>

              {/* EMPTY STATE */}

              {!error && visibleOrders.length === 0 && (

                <div className="py-16 text-center">

                  <ShoppingBag
                    size={55}
                    className="mx-auto text-[#E51B23]"
                  />

                  <h3 className="mt-5 text-xl font-bold">
                    No orders found
                  </h3>

                  <p className="mt-3 text-sm text-white/70">
                    Your matching orders will appear here.
                  </p>

                  <Link
                    href="/menu"
                    className="mt-6 inline-flex rounded-xl bg-[#C9151B] px-6 py-3 font-semibold"
                  >
                    Browse Menu
                  </Link>

                </div>

              )}

              {/* ORDER LIST */}

              <div className="space-y-4">

                {visibleOrders.map(order => {
                  const item = getItem(order);

                  return (

                    <motion.article
                      layout
                      key={order._id}
                      className="rounded-xl border border-[#351010] bg-[#141414] p-4 sm:p-5"
                    >

                      <div className="flex flex-wrap items-start gap-4">

                        <OrderImage item={item} />

                        <div className="min-w-0 flex-1">

                          <h3 className="text-lg font-bold">
                            {item.itemName ||
                              item.name ||
                              "Menu item"}
                          </h3>

                          <p className="mt-2 text-sm text-white/70">
                            {order.vendor?.businessName ||
                              order.vendor?.name ||
                              "Vendor information unavailable"}
                          </p>

                          {typeof item.price === "number" && (

                            <p className="mt-2 font-bold text-[#FF4545]">
                              {formatPrice(item.price)}
                            </p>

                          )}

                        </div>

                        <span
                          className={`rounded-full px-3 py-1.5 text-xs font-bold capitalize ${getStatusClass(order.status)}`}
                        >
                          {order.status}
                        </span>

                      </div>

                      <div className="mt-5 grid gap-3 border-t border-[#351010] pt-4 text-sm sm:grid-cols-2">

                        <div className="flex items-start gap-2">

                          <CalendarDays
                            size={17}
                            className="shrink-0 text-[#E51B23]"
                          />

                          <span>
                            Delivery:{" "}
                            {formatDate(order.deliveryDate)}
                          </span>

                        </div>

                        <div className="flex items-start gap-2">

                          <MapPin
                            size={17}
                            className="shrink-0 text-[#E51B23]"
                          />

                          <span>
                            {order.deliveryAddress}
                          </span>

                        </div>

                        <div className="text-xs text-white/70">
                          Requested:{" "}
                          {formatDate(order.createdAt)}
                        </div>

                      </div>

                      <div className="mt-5 flex flex-wrap gap-3">

                        <button
                          onClick={() => setSelected(order)}
                          className="rounded-lg bg-[#C9151B] px-5 py-2.5 text-sm font-bold hover:bg-[#E51B23]"
                        >
                          View Details
                        </button>

                        {order.status === "pending" && (

                          <button
                            onClick={() =>
                              setCancelTarget(order)
                            }
                            className="rounded-lg border border-[#E51B23] px-5 py-2.5 text-sm font-bold text-[#FF4545] hover:bg-[#1C0808]"
                          >
                            Cancel Order
                          </button>

                        )}

                      </div>

                    </motion.article>

                  );
                })}

              </div>

            </section>

          </main>

          <footer className="border-t border-[#351010] px-5 py-6 text-center text-xs text-white/60">
            PizzaHub Customer Dashboard
          </footer>

        </div>

        {/* ORDER DETAILS MODAL */}

        {selected && (

          <div className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 p-4">

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Order details"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#351010] bg-[#101010] p-6"
            >

              <div className="mb-6 flex items-center justify-between">

                <h2 className="text-2xl font-bold">
                  Order Details
                </h2>

                <button
                  aria-label="Close details"
                  onClick={() => setSelected(null)}
                >
                  <X size={24} />
                </button>

              </div>

              <div className="mb-5 flex items-center gap-4">

                <OrderImage item={getItem(selected)} />

                <div>

                  <h3 className="text-xl font-bold">
                    {getItem(selected).itemName ||
                      getItem(selected).name ||
                      "Menu item"}
                  </h3>

                  <span
                    className={`mt-2 inline-block rounded-full px-3 py-1 text-xs capitalize ${getStatusClass(selected.status)}`}
                  >
                    {selected.status}
                  </span>

                </div>

              </div>

              <div className="space-y-5 rounded-xl border border-[#351010] bg-[#141414] p-5 text-sm">

                <div>
                  <p className="text-white/60">
                    Order ID
                  </p>

                  <p className="mt-1 break-all font-medium">
                    {selected._id}
                  </p>
                </div>

                <div>
                  <p className="text-white/60">
                    Restaurant
                  </p>

                  <p className="mt-1 flex items-center gap-2">

                    <Store size={17} />

                    {selected.vendor?.businessName ||
                      selected.vendor?.name ||
                      "Not available"}

                  </p>
                </div>

                <div>
                  <p className="text-white/60">
                    Delivery date
                  </p>

                  <p className="mt-1">
                    {formatDate(selected.deliveryDate)}
                  </p>
                </div>

                <div>
                  <p className="text-white/60">
                    Delivery address
                  </p>

                  <p className="mt-1">
                    {selected.deliveryAddress}
                  </p>
                </div>

                <div>
                  <p className="text-white/60">
                    Customer message
                  </p>

                  <p className="mt-1">
                    {selected.message || "No message"}
                  </p>
                </div>

                <div>
                  <p className="text-white/60">
                    Request date
                  </p>

                  <p className="mt-1">
                    {formatDate(selected.createdAt)}
                  </p>
                </div>

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

        {/* CANCEL CONFIRMATION */}

        {cancelTarget && (

          <div className="fixed inset-0 z-80 flex items-center justify-center bg-black/80 p-4">

            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Cancel order confirmation"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-sm rounded-2xl border border-[#351010] bg-[#101010] p-7"
            >

              <XCircle
                size={48}
                className="mx-auto text-[#FF4545]"
              />

              <h2 className="mt-5 text-center text-2xl font-bold">
                Cancel Order?
              </h2>

              <p className="mt-4 text-center text-sm leading-6 text-white/80">
                Are you sure you want to cancel this
                pending order?
              </p>

              <div className="mt-7 grid grid-cols-2 gap-3">

                <button
                  disabled={cancelling}
                  onClick={() => setCancelTarget(null)}
                  className="rounded-xl border border-[#351010] py-3 text-sm font-semibold"
                >
                  Keep Order
                </button>

                <button
                  disabled={cancelling}
                  onClick={cancelOrder}
                  className="rounded-xl bg-[#C9151B] py-3 text-sm font-semibold disabled:opacity-50"
                >
                  {cancelling
                    ? "Cancelling..."
                    : "Yes, Cancel"}
                </button>

              </div>

            </motion.div>

          </div>

        )}

      </div>

    </MotionConfig>
  );
}
