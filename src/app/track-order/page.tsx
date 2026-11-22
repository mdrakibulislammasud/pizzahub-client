"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { motion } from "motion/react";

import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  LoaderCircle,
  MapPin,
  PackageCheck,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  XCircle,
} from "lucide-react";

const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/+$/, "");

type OrderStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "cancelled";

interface Account {
  id: string;
  name: string;
  role: string;
  isBlocked?: boolean;
}

interface MenuInfo {
  itemName?: string;
  price?: number;
  images?: string[];
  category?: string;
  location?: string;
}

interface VendorInfo {
  name?: string;
  businessName?: string;
  email?: string;
}

interface Order {
  _id: string;
  itemId: string;
  status: OrderStatus;
  deliveryDate: string;
  deliveryAddress: string;
  message?: string;
  createdAt: string;
  menuItem?: MenuInfo | null;
  itemSnapshot?: MenuInfo | null;
  vendor?: VendorInfo | null;
}

function extractOrders(response: unknown): Order[] {
  if (!response || typeof response !== "object") {
    throw new Error("Invalid order response.");
  }

  const result = response as {
    success?: boolean;
    message?: string;
    data?: unknown;
    orders?: unknown;
  };

  if (result.success === false) {
    throw new Error(result.message || "Unable to fetch orders.");
  }

  const data = result.data;

  if (Array.isArray(data)) {
    return data as Order[];
  }

  if (
    data &&
    typeof data === "object" &&
    "orders" in data &&
    Array.isArray(data.orders)
  ) {
    return data.orders as Order[];
  }

  if (Array.isArray(result.orders)) {
    return result.orders as Order[];
  }

  throw new Error("The server returned an unexpected order format.");
}

async function fetchMyOrders(token: string, role: string): Promise<Order[]> {
  const endpoint =
    role === "customer"
      ? "/api/orders/my-orders"
      : role === "vendor"
        ? "/api/orders/vendor/my-orders"
        : role === "admin"
          ? "/api/admin/orders"
          : null;

  if (!endpoint) {
    throw new Error("Your account role cannot access order tracking.");
  }
  const response = await fetch(`${API}${endpoint}`, {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(
      data?.message ||
      (response.status === 401
        ? "Your session expired. Please sign in again."
        : "Failed to load your orders.")
    );
  }

  return extractOrders(data);
}

function formatDate(value?: string) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "Asia/Dhaka",
  });
}

function formatPrice(value?: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Price unavailable";
  }

  return `৳${value.toLocaleString("en-BD")}`;
}

function getStatusInfo(status: OrderStatus) {
  switch (status) {
    case "accepted":
      return {
        label: "Accepted",
        message: "The restaurant has accepted your order.",
        color: "text-green-400",
        bg: "bg-green-500/10",
        border: "border-green-800/50",
      };

    case "rejected":
      return {
        label: "Rejected",
        message: "The restaurant has rejected this order.",
        color: "text-red-400",
        bg: "bg-red-500/10",
        border: "border-red-900/50",
      };

    case "cancelled":
      return {
        label: "Cancelled",
        message: "This order was cancelled.",
        color: "text-gray-300",
        bg: "bg-white/5",
        border: "border-white/15",
      };

    default:
      return {
        label: "Pending",
        message: "Waiting for the restaurant to respond.",
        color: "text-amber-400",
        bg: "bg-amber-500/10",
        border: "border-amber-800/50",
      };
  }
}

export default function TrackOrderPage() {
  const [user, setUser] = useState<Account | null>(null);
  const [token, setToken] = useState("");

  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [searchId, setSearchId] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  // ======================================
  // CUSTOMER AUTHENTICATION
  // ======================================

  useEffect(() => {
    let cancelled = false;

    async function initialize() {
      try {
        const sessionResponse = await fetch(
          `${API}/api/auth/get-session?disableCookieCache=true`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        if (sessionResponse.status === 401) {
          window.location.replace("/sign-in");
          return;
        }

        if (!sessionResponse.ok) {
          throw new Error("Unable to verify your account.");
        }

        const session = await sessionResponse.json();

        const account: Account | undefined = session?.user;

        if (!account) {
          window.location.replace("/sign-in");
          return;
        }

        if (!["customer", "vendor", "admin"].includes(account.role) || account.isBlocked) {
          throw new Error(
            "Only active customer, vendor or admin accounts can track orders."
          );
        }

        const tokenResponse = await fetch(`${API}/api/auth/token`, {
          credentials: "include",
          cache: "no-store",
        });

        const tokenData = await tokenResponse.json().catch(() => null);

        if (!tokenResponse.ok || !tokenData?.token) {
          throw new Error("Authentication token unavailable.");
        }

        const jwt: string = tokenData.token;
        const receivedOrders = await fetchMyOrders(jwt, account.role);

        if (cancelled) return;

        const requestedId =
          new URLSearchParams(window.location.search).get("orderId") ||
          "";

        setUser(account);
        setToken(jwt);
        setOrders(receivedOrders);
        setUpdatedAt(new Date());

        setSelectedId(requestedId || receivedOrders[0]?._id || "");
        setSearchId(requestedId);

      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to initialize order tracking."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void initialize();

    return () => {
      cancelled = true;
    };
  }, []);

  // ======================================
  // LOAD LATEST ORDER STATUS
  // ======================================

  const refreshOrders = useCallback(
    async (silent = false) => {
      if (!token || !user?.role) return;

      if (!silent) setRefreshing(true);

      try {
        const updated = await fetchMyOrders(token, user.role);

        setOrders(updated);
        setUpdatedAt(new Date());
        setError("");

      } catch (err) {
        if (!silent) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to refresh orders."
          );
        }
      } finally {
        if (!silent) setRefreshing(false);
      }
    },
    [token, user]
  );

  // Automatic refresh every 30 seconds.

  useEffect(() => {
    if (!token) return;

    const interval = window.setInterval(() => {
      void refreshOrders(true);
    }, 30000);

    return () => window.clearInterval(interval);
  }, [token, refreshOrders]);

  const selectedOrder = orders.find(
    order => order._id === selectedId
  );

  // ======================================
  // ORDER SEARCH AND SELECTION
  // ======================================

  function selectOrder(orderId: string) {
    setSelectedId(orderId);
    setSearchId(orderId);
    setSearchError("");

    window.history.replaceState(
      null,
      "",
      `/track-order?orderId=${encodeURIComponent(orderId)}`
    );
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const input = searchId.trim().replace(/^#/, "");

    if (!input) {
      setSearchError("Enter an Order ID.");
      return;
    }

    const match = orders.find(
      order => order._id.toLowerCase() === input.toLowerCase()
    );

    if (!match) {
      setSearchError(
        "Order not found in your account. Check the Order ID."
      );
      return;
    }

    selectOrder(match._id);
  }

  // ======================================
  // LOADING
  // ======================================

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080808] text-white">
        <div className="text-center">
          <LoaderCircle
            size={40}
            className="mx-auto animate-spin text-[#E51B23]"
          />
          <p className="mt-4 text-sm text-white/70">
            Loading your orders...
          </p>
        </div>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#080808] px-5 text-white">
        <div className="w-full max-w-md rounded-3xl border border-red-900/40 bg-[#141414] p-8 text-center">
          <XCircle
            size={42}
            className="mx-auto text-red-400"
          />
          <h1 className="mt-4 text-2xl font-bold">
            Order Tracking Unavailable
          </h1>
          <p className="mt-3 text-sm text-white/70">
            {error || "Please sign in as a customer."}
          </p>
          <Link
            href="/sign-in"
            className="mt-6 inline-flex rounded-xl bg-[#C9151B] px-6 py-3 font-bold"
          >
            Sign In
          </Link>
        </div>
      </main>
    );
  }

  const item = selectedOrder?.menuItem ||
    selectedOrder?.itemSnapshot;

  const statusInfo = selectedOrder
    ? getStatusInfo(selectedOrder.status)
    : null;

  const vendorName =
    selectedOrder?.vendor?.businessName ||
    selectedOrder?.vendor?.name ||
    "Restaurant";

  return (
    <main className="min-h-screen bg-[#080808] text-white">
      {/* TOP BAR */}

      <header className="border-b border-[#351010] bg-[#101010]">
        <div className="mx-auto flex min-h-20 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6">
          <Link
            href="/"
            className="flex min-w-0 items-center gap-2"
          >
            <img
              src="/images/pizzahub-logo.svg"
              alt=""
              className="h-10 w-10 shrink-0 object-contain"
            />
            <span className="font-serif text-2xl font-bold">
              Pizza<span className="text-[#E51B23]">Hub.</span>
            </span>
          </Link>

          <Link
            href={`/dashboard/${user.role}`}
            className="flex items-center gap-2 text-xs font-bold text-white/80 hover:text-white sm:text-sm"
          >
            <ArrowLeft size={17} />
            Dashboard
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12">
        {/* PAGE TITLE */}

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#FF4545]">
            PizzaHub Customer Service
          </p>

          <h1 className="mt-3 font-serif text-3xl font-bold sm:text-5xl">
            Track Your <span className="text-[#E51B23]">Order.</span>
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-7 text-white/65">
            Check the latest status of orders placed from your account.
            Status refreshes automatically every 30 seconds.
          </p>
        </motion.div>

        {/* SEARCH */}

        <form
          onSubmit={handleSearch}
          className="mt-8 flex flex-col gap-3 sm:flex-row"
        >
          <div className="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-[#351010] bg-[#141414] px-4">
            <Search className="shrink-0 text-[#E51B23]" size={19} />
            <input
              value={searchId}
              onChange={event => {
                setSearchId(event.target.value);
                setSearchError("");
              }}
              placeholder="Enter your Order ID"
              aria-label="Order ID"
              className="min-h-14 w-full min-w-0 bg-transparent text-sm text-white outline-none placeholder:text-white/35"
            />
          </div>

          <button
            type="submit"
            className="flex min-h-14 items-center justify-center gap-2 rounded-xl bg-[#C9151B] px-7 text-sm font-bold hover:bg-[#E51B23]"
          >
            Track Order
            <ArrowRight size={18} />
          </button>
        </form>

        {searchError && (
          <p role="alert" className="mt-3 text-sm text-red-400">
            {searchError}
          </p>
        )}

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-red-900/50 bg-red-950/20 p-4 text-sm text-red-300"
          >
            {error}
          </p>
        )}

        {/* TRACKING CONTENT */}

        <div className="mt-8 grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          {/* OWN ORDERS */}

          <section className="min-w-0 rounded-2xl border border-[#351010] bg-[#111111] p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">My Orders</h2>
              <span className="text-sm text-white/50">
                {orders.length}
              </span>
            </div>

            {orders.length === 0 ? (
              <div className="py-10 text-center">
                <ShoppingBag
                  size={36}
                  className="mx-auto text-[#E51B23]"
                />
                <p className="mt-4 text-sm text-white/65">
                  No orders found.
                </p>
                <Link
                  href="/menu"
                  className="mt-5 inline-block text-sm font-bold text-[#FF4545]"
                >
                  Browse Menu
                </Link>
              </div>
            ) : (
              <div className="max-h-[550px] space-y-2 overflow-y-auto">
                {orders.map(order => {
                  const product =
                    order.menuItem || order.itemSnapshot;

                  const active = selectedId === order._id;
                  const detail = getStatusInfo(order.status);

                  return (
                    <button
                      type="button"
                      key={order._id}
                      onClick={() => selectOrder(order._id)}
                      className={`w-full rounded-xl border p-3 text-left transition ${
                        active
                          ? "border-[#E51B23] bg-[#270909]"
                          : "border-[#351010] bg-[#080808] hover:border-red-800"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {product?.images?.[0] ? (
                          <img
                            src={product.images[0]}
                            alt=""
                            className="h-14 w-14 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-lg bg-[#250808]">
                            <ShoppingBag
                              className="text-[#E51B23]"
                              size={22}
                            />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-bold">
                            {product?.itemName || "Pizza Order"}
                          </p>
                          <p className={`mt-1 text-xs font-semibold ${detail.color}`}>
                            {detail.label}
                          </p>
                          <p className="mt-1 truncate text-[11px] text-white/45">
                            #{order._id.slice(-8).toUpperCase()}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* SELECTED ORDER */}

          <section className="min-w-0 overflow-hidden rounded-2xl border border-[#351010] bg-[#111111]">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#351010] p-5 sm:p-6">
              <div>
                <h2 className="text-xl font-bold">Order Tracking</h2>
                <p className="mt-2 text-xs text-white/50">
                  {updatedAt
                    ? `Last checked ${updatedAt.toLocaleTimeString("en-BD")}`
                    : "Waiting for update"}
                </p>
              </div>

              <button
                type="button"
                disabled={refreshing}
                onClick={() => void refreshOrders(false)}
                className="flex items-center gap-2 rounded-xl border border-[#351010] px-4 py-3 text-xs font-bold hover:border-[#E51B23] disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={refreshing ? "animate-spin" : ""}
                />
                Refresh Status
              </button>
            </div>

            {!selectedOrder ? (
              <div className="p-8 text-center text-sm text-white/65">
                <ShoppingBag
                  size={35}
                  className="mx-auto mb-4 text-[#E51B23]"
                />
                {orders.length
                  ? "Select one of your orders to view its tracking details."
                  : "Place an order to start tracking."}
              </div>
            ) : (
              <div className="space-y-7 p-5 sm:p-7">
                {/* STATUS */}

                <div
                  aria-live="polite"
                  className={`rounded-xl border p-5 ${statusInfo?.bg} ${statusInfo?.border}`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {selectedOrder.status === "accepted" ? (
                        <CheckCircle2 className="text-green-400" size={27} />
                      ) : selectedOrder.status === "pending" ? (
                        <Clock3 className="text-amber-400" size={27} />
                      ) : (
                        <XCircle className="text-red-400" size={27} />
                      )}

                      <div>
                        <p className="text-xs text-white/55">
                          Current Status
                        </p>
                        <p className={`mt-1 text-xl font-bold ${statusInfo?.color}`}>
                          {statusInfo?.label}
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-white/75">
                    {statusInfo?.message}
                  </p>
                </div>

                {/* TIMELINE */}

                <div>
                  <h3 className="mb-5 text-lg font-bold">
                    Tracking Timeline
                  </h3>

                  <div className="relative ml-3 border-l border-[#542020] pl-7">
                    <div className="relative pb-7">
                      <CheckCircle2
                        size={23}
                        className="absolute -left-[40px] top-0 bg-[#111111] text-green-400"
                      />
                      <p className="font-bold">Order Placed</p>
                      <p className="mt-1 text-xs text-white/60">
                        {formatDate(selectedOrder.createdAt)}
                      </p>
                    </div>

                    <div className="relative pb-7">
                      {selectedOrder.status === "pending" ? (
                        <Clock3
                          size={23}
                          className="absolute -left-[40px] top-0 bg-[#111111] text-amber-400"
                        />
                      ) : (
                        <CheckCircle2
                          size={23}
                          className="absolute -left-[40px] top-0 bg-[#111111] text-green-400"
                        />
                      )}

                      <p className="font-bold">
                        {selectedOrder.status === "pending"
                          ? "Waiting for Vendor"
                          : "Vendor Review Completed"}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/60">
                        {selectedOrder.status === "pending"
                          ? "The restaurant has not responded yet."
                          : "Your order received a final response."}
                      </p>
                    </div>

                    <div className="relative">
                      {selectedOrder.status === "accepted" ? (
                        <PackageCheck
                          size={23}
                          className="absolute -left-[40px] top-0 bg-[#111111] text-green-400"
                        />
                      ) : selectedOrder.status === "pending" ? (
                        <Clock3
                          size={23}
                          className="absolute -left-[40px] top-0 bg-[#111111] text-white/40"
                        />
                      ) : (
                        <XCircle
                          size={23}
                          className="absolute -left-[40px] top-0 bg-[#111111] text-red-400"
                        />
                      )}

                      <p className="font-bold">
                        {selectedOrder.status === "accepted"
                          ? "Order Accepted"
                          : selectedOrder.status === "rejected"
                            ? "Order Rejected"
                            : selectedOrder.status === "cancelled"
                              ? "Order Cancelled"
                              : "Awaiting Decision"}
                      </p>

                      <p className="mt-1 text-xs leading-5 text-white/60">
                        {selectedOrder.status === "accepted"
                          ? "The restaurant accepted the order. This does not mean it has been delivered."
                          : selectedOrder.status === "pending"
                            ? "This step updates when the vendor responds."
                            : "No further processing is scheduled for this order."}
                      </p>
                    </div>
                  </div>
                </div>

                {/* ORDER DETAILS */}

                <div className="border-t border-[#351010] pt-6">
                  <h3 className="text-lg font-bold">Order Details</h3>

                  <p className="mt-3 break-all text-xs text-white/50">
                    Order ID: {selectedOrder._id}
                  </p>

                  <div className="mt-5 flex items-center gap-4">
                    {item?.images?.[0] ? (
                      <img
                        src={item.images[0]}
                        alt={item.itemName || "Pizza"}
                        className="h-20 w-20 shrink-0 rounded-xl object-cover"
                      />
                    ) : (
                      <ShoppingBag
                        size={35}
                        className="text-[#E51B23]"
                      />
                    )}

                    <div className="min-w-0">
                      <p className="break-words font-bold">
                        {item?.itemName || "Pizza Order"}
                      </p>
                      <p className="mt-2 font-bold text-[#FF4545]">
                        {formatPrice(item?.price)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-xl bg-[#080808] p-4">
                      <div className="flex items-center gap-2 text-xs text-white/55">
                        <Store size={16} />
                        Restaurant
                      </div>
                      <p className="mt-2 break-words text-sm font-semibold">
                        {vendorName}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#080808] p-4">
                      <div className="flex items-center gap-2 text-xs text-white/55">
                        <CalendarDays size={16} />
                        Requested Delivery Date
                      </div>
                      <p className="mt-2 text-sm font-semibold">
                        {formatDate(selectedOrder.deliveryDate)}
                      </p>
                    </div>

                    <div className="rounded-xl bg-[#080808] p-4 sm:col-span-2">
                      <div className="flex items-center gap-2 text-xs text-white/55">
                        <MapPin size={16} />
                        Delivery Address
                      </div>
                      <p className="mt-2 break-words text-sm font-semibold">
                        {selectedOrder.deliveryAddress}
                      </p>
                    </div>
                  </div>

                  {selectedOrder.message && (
                    <div className="mt-4 rounded-xl bg-[#080808] p-4">
                      <p className="text-xs text-white/55">
                        Your Message
                      </p>
                      <p className="mt-2 break-words text-sm">
                        {selectedOrder.message}
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-[#351010] p-4 text-xs leading-6 text-white/60">
                  Order tracking shows the latest restaurant decision.
                  Live delivery location is not available.
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
