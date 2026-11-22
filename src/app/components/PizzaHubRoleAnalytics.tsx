"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  LoaderCircle,
  Pizza,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  TrendingUp,
  Users,
} from "lucide-react";

type Role = "admin" | "vendor";

type Order = {
  id: string;
  customer: string;
  restaurant?: string;
  itemName: string;
  itemPrice: number | null;
  status: string;
  createdAt: string;
};

type Trend = {
  day: string;
  total?: number;
  orders?: number;
  accepted?: number;
};

type Revenue = {
  currency: string;
  amountMinor: number;
  count: number;
};

type Analytics = {
  overview: Record<string, number>;
  statuses: Record<string, number>;
  totalOrders?: number;
  orderCount?: number;
  trends: Trend[];
  recentOrders: Order[];
  revenues?: Revenue[];
  subscriptionSpend?: Revenue[];
  vendor?: {
    name: string;
    subscriptionPlan: string;
    subscriptionExpiresAt?: string | null;
  };
  topItems?: {
    id: string;
    name: string;
    count: number;
  }[];
};

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

const number = (value?: number) =>
  (value ?? 0).toLocaleString("en-US");

function Metric({
  label,
  value,
  detail,
}: {
  label: string;
  value: string;
  detail: string;
}) {
  return (
    <div className="rounded-2xl border border-[#351010] bg-[#141414] p-5 shadow-sm">
      <p className="text-sm text-white/70">
        {label}
      </p>

      <h2 className="mt-3 text-3xl font-bold tracking-tight text-white">
        {value}
      </h2>

      <p className="mt-2 text-xs text-white/50">
        {detail}
      </p>
    </div>
  );
}

function TrendChart({
  values,
}: {
  values: Trend[];
}) {
  const width = 700;
  const height = 230;
  const left = 55;
  const right = 680;
  const top = 22;
  const bottom = 175;

  const totals = values.map(
    (item) => item.orders ?? item.total ?? 0
  );

  const accepted = values.map(
    (item) => item.accepted ?? 0
  );

  const rawMax = Math.max(1, ...totals, ...accepted);
  const max = Math.ceil(rawMax / 4) * 4 || 4;

  const x = (index: number) =>
    left +
    (index / Math.max(values.length - 1, 1)) *
      (right - left);

  const y = (value: number) =>
    bottom - (value / max) * (bottom - top);

  const getPoints = (data: number[]) =>
    data.map((value, index) =>
      `${x(index)},${y(value)}`
    ).join(" ");

  const totalPoints = getPoints(totals);
  const acceptedPoints = getPoints(accepted);

  const areaPath = totals.length
    ? `M ${left},${bottom} L ${totalPoints} L ${x(totals.length - 1)},${bottom} Z`
    : "";

  if (!values.length) {
    return (
      <p className="py-16 text-center text-slate-400">
        No chart data available.
      </p>
    );
  }

  const middleIndex = Math.floor((values.length - 1) / 2);

  return (
    <div className="mt-5">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full overflow-visible"
        role="img"
        aria-label="Order trends showing total and accepted orders"
      >
        <defs>
          <linearGradient id="ordersArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#FF5B6B" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#FF5B6B" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {[0, 1, 2, 3, 4].map((tick) => {
          const value = (max / 4) * (4 - tick);
          const lineY = top + tick * ((bottom - top) / 4);

          return (
            <g key={tick}>
              <line
                x1={left}
                x2={right}
                y1={lineY}
                y2={lineY}
                stroke="#E2E8F0"
                strokeWidth="1"
                strokeDasharray="4 5"
              />
              <text
                x="42"
                y={lineY + 4}
                textAnchor="end"
                fill="#94A3B8"
                fontSize="11"
              >
                {Math.round(value)}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#ordersArea)" />

        <polyline
          points={totalPoints}
          fill="none"
          stroke="#FF5B6B"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <polyline
          points={acceptedPoints}
          fill="none"
          stroke="#36BFAE"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />



        <text x={left} y="207" fill="#94A3B8" fontSize="11">
          {values[0]?.day}
        </text>

        {values.length > 2 && (
          <text
            x={x(middleIndex)}
            y="207"
            textAnchor="middle"
            fill="#94A3B8"
            fontSize="11"
          >
            {values[middleIndex]?.day}
          </text>
        )}

        {values.length > 1 && (
          <text
            x={right}
            y="207"
            textAnchor="end"
            fill="#94A3B8"
            fontSize="11"
          >
            {values[values.length - 1]?.day}
          </text>
        )}
      </svg>

      <div className="mt-3 flex flex-wrap justify-center gap-x-7 gap-y-3 text-xs font-medium text-slate-600">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#FF5B6B]" />
          Total Orders
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[#36BFAE]" />
          Accepted Orders
        </span>
      </div>
    </div>
  );
}
function StatusRing({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const percent = total
    ? Math.min(100, Math.round((value / total) * 100))
    : 0;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-2 py-4 text-center shadow-sm transition-shadow hover:shadow-md">
      <div
        className="mx-auto flex h-24 w-24 items-center justify-center rounded-full"
        style={{
          background: `conic-gradient(${color} 0%, ${color} 100%)`,
        }}
      >
        <div className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white text-xl font-extrabold tracking-tight text-slate-800">
          {percent}%
        </div>
      </div>

      <p className="mt-3 text-sm font-bold" style={{ color }}>
        {label}
      </p>

      <p className="mt-1 text-xs font-medium text-slate-500">
        {number(value)} orders
      </p>
    </div>
  );
}

export default function PizzaHubRoleAnalytics({
  role,
}: {
  role: Role;
}) {
  const router = useRouter();

  const [days, setDays] = useState(30);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const home = `/dashboard/${role}`;

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setError("");

      try {
        const sessionResponse = await fetch(
          `${API}/api/auth/get-session`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const session = await sessionResponse
          .json()
          .catch(() => null);

        if (!session?.user) {
          router.replace("/sign-in");
          return;
        }

        if (session.user.role !== role) {
          throw new Error(
            "You do not have permission to view this dashboard."
          );
        }

        const tokenResponse = await fetch(
          `${API}/api/auth/token`,
          {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        const tokenData = await tokenResponse
          .json()
          .catch(() => null);

        const token =
          tokenData?.token ??
          tokenData?.data?.token;

        if (!tokenResponse.ok || !token) {
          throw new Error(
            "Authentication token unavailable."
          );
        }

        const endpoint =
          role === "admin"
            ? "/api/admin/analytics"
            : "/api/orders/vendor/analytics";

        const response = await fetch(
          `${API}${endpoint}?days=${days}`,
          {
            cache: "no-store",
            signal: controller.signal,
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          }
        );

        const result = await response
          .json()
          .catch(() => null);

        if (!response.ok || !result?.success) {
          throw new Error(
            result?.message ||
            `Analytics API returned HTTP ${response.status}.`
          );
        }

        if (!controller.signal.aborted) {
          setData(result.data);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          setData(null);
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load analytics."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();

    return () => controller.abort();
  }, [role, days, refresh, router]);

  const overview = data?.overview ?? {};
  const statuses = data?.statuses ?? {};

  const total =
    data?.totalOrders ??
    data?.orderCount ??
    0;

  const stats =
    role === "admin"
      ? [
          {
            label: "Total Restaurants",
            value: number(overview.totalVendors),
            detail: "Registered vendors",
          },
          {
            label: "Total Customers",
            value: number(overview.totalCustomers),
            detail: "Registered customers",
          },
          {
            label: "Menu Items",
            value: number(overview.totalMenuItems),
            detail: "All menu listings",
          },
          {
            label: "Transactions",
            value: number(overview.totalTransactions),
            detail: "All subscription records",
          },
        ]
      : [
          {
            label: "Total Menu Items",
            value: number(overview.totalMenuItems),
            detail: "Your restaurant listings",
          },
          {
            label: "Active Menu Items",
            value: number(overview.activeMenuItems),
            detail: "Approved and available",
          },
          {
            label: "Pending Orders",
            value: number(overview.pendingOrders),
            detail: "Awaiting a decision",
          },
          {
            label: "Accepted Orders",
            value: number(overview.acceptedOrders),
            detail: `Last ${days} days`,
          },
        ];

  const orders = useMemo(
    () =>
      (data?.recentOrders ?? []).filter((order) => {
        const matchesStatus =
          status === "all" ||
          order.status === status;

        const text = [
          order.id,
          order.customer,
          order.restaurant ?? "",
          order.itemName,
        ].join(" ").toLowerCase();

        return (
          matchesStatus &&
          text.includes(search.toLowerCase().trim())
        );
      }),
    [data, status, search]
  );

  return (
    <main className="min-h-screen bg-[#080808] text-white lg:flex">

      <aside className="border-b border-[#351010] bg-[#141414] p-5 lg:min-h-screen lg:w-60 lg:border-b-0 lg:border-r">

        <Link
          href="/"
          className="flex items-center gap-2 text-xl font-extrabold text-[#FF4545]"
        >
          <Pizza size={26} />
          PizzaHub
        </Link>

        <p className="mt-2 text-xs font-semibold uppercase tracking-widest text-white/50">
          {role === "admin" ? "Admin Dashboard" : "Owner Dashboard"}
        </p>

        <nav className="mt-8 flex flex-wrap gap-2 lg:flex-col">

          <Link
            href={home}
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-[#1C0808]"
          >
            <LayoutDashboard size={18} />
            Dashboard
          </Link>

          <Link
            href={`${home}/analytics`}
            className="flex items-center gap-3 rounded-xl bg-[#1C0808] px-4 py-3 text-sm font-semibold text-[#FF4545]"
          >
            <BarChart3 size={18} />
            Analytics
          </Link>

          <a
            href="#orders"
            className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-[#1C0808]"
          >
            <ClipboardList size={18} />
            Recent Orders
          </a>

        </nav>

        <div className="mt-8 hidden rounded-xl bg-[#101010] p-4 text-xs text-white/70 lg:block">
          <ShieldCheck size={20} className="mb-2 text-[#35D6C0]" />
          Secure role-based analytics
        </div>
      </aside>

      <section className="min-w-0 flex-1 p-4 sm:p-7 lg:p-9">

        <header className="mb-7 flex flex-wrap items-center justify-between gap-4">

          <div>
            <h1 className="text-2xl font-extrabold sm:text-3xl">
              {role === "admin"
                ? "Platform Analytics"
                : "Owner Analytics"}
            </h1>

            <p className="mt-1 text-sm text-white/70">
              {role === "admin"
                ? "PizzaHub platform statistics"
                : "Track your orders, customers, and menu performance in one place."}
            </p>
          </div>

          <div className="flex items-center gap-2">

            <select
              aria-label="Analytics period"
              value={days}
              onChange={(e) =>
                setDays(Number(e.target.value))
              }
              className="rounded-xl border border-[#351010] bg-[#141414] px-4 py-3 text-sm"
            >
              <option value={7}>Last 7 days</option>
              <option value={30}>Last 30 days</option>
              <option value={90}>Last 90 days</option>
            </select>

            <button
              type="button"
              onClick={() =>
                setRefresh((n) => n + 1)
              }
              className="rounded-xl border border-[#351010] bg-[#141414] p-3"
              aria-label="Refresh analytics"
            >
              <RefreshCw
                size={18}
                className={loading ? "animate-spin" : ""}
              />
            </button>

          </div>
        </header>

        {loading && (
          <div className="flex items-center gap-3 rounded-2xl bg-[#141414] p-8 text-white/70">
            <LoaderCircle className="animate-spin" />
            Loading analytics...
          </div>
        )}

        {error && (
          <div
            role="alert"
            className="mb-6 rounded-xl border border-[#7F1D1D] bg-[#1C0808] p-5 text-[#FF7777]"
          >
            {error}
          </div>
        )}

        {!loading && data && (
          <div className="space-y-5">

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">

              {stats.map((stat) => (
                <Metric
                  key={stat.label}
                  label={stat.label}
                  value={stat.value}
                  detail={stat.detail}
                />
              ))}

            </section>

            <div className="grid gap-5 xl:grid-cols-[1.5fr_1fr]">

              <section className="rounded-2xl border border-[#351010] bg-[#141414] p-6 shadow-sm">

                <h2 className="text-lg font-bold">
                  Order Analytics
                </h2>

                <p className="mt-2 text-3xl font-bold">
                  {number(total)}
                  <span className="ml-2 text-sm font-normal text-white/50">
                    orders
                  </span>
                </p>

                <TrendChart
                  values={data.trends ?? []}
                />

              </section>

              <section className="rounded-2xl border border-[#351010] bg-[#141414] p-6 shadow-sm">

                <h2 className="mb-7 text-lg font-bold">
                  Order Performance
                </h2>

                <div className="grid grid-cols-3 gap-2">

                  <StatusRing
                    label="Accepted"
                    value={statuses.accepted ?? 0}
                    total={total}
                    color="#10B981"
                  />

                  <StatusRing
                    label="Rejected"
                    value={statuses.rejected ?? 0}
                    total={total}
                    color="#EF4444"
                  />

                  <StatusRing
                    label="Pending"
                    value={statuses.pending ?? 0}
                    total={total}
                    color="#EAB308"
                  />

                </div>

                <p className="mt-6 text-center text-xs text-white/70">
                  {number(statuses.cancelled)} cancelled orders
                </p>

              </section>

            </div>

            {role === "vendor" && (
              <div className="grid gap-5 md:grid-cols-2">

                <Metric
                  label="Unique Customers"
                  value={number(
                    overview.uniqueCustomers
                  )}
                  detail={`Last ${days} days`}
                />

                <Metric
                  label="Accepted Order Value"
                  value={"\u09F3" + number(overview.acceptedOrderValue)}
                  detail="Item value, not received payment"
                />

                <div className="rounded-2xl border border-[#351010] bg-[#141414] p-5">
                  <p className="text-sm text-white/70">
                    Subscription
                  </p>

                  <p className="mt-3 text-2xl font-bold capitalize">
                    {data.vendor?.subscriptionPlan ??
                      "Unknown"}
                  </p>

                  <p className="mt-2 text-xs text-white/50">
                    Current vendor plan
                  </p>
                </div>

                <div className="rounded-2xl border border-[#351010] bg-[#141414] p-5">
                  <p className="text-sm text-white/70">
                    Most Ordered Pizza
                  </p>

                  <p className="mt-3 text-xl font-bold">
                    {data.topItems?.[0]?.name ??
                      "No orders yet"}
                  </p>

                  <p className="mt-2 text-xs text-white/50">
                    {number(
                      data.topItems?.[0]?.count
                    )} orders
                  </p>
                </div>

              </div>
            )}

            {role === "admin" && (
              <div className="grid gap-4 sm:grid-cols-2">

                <Metric
                  label="Pending Menu Approvals"
                  value={number(
                    overview.pendingMenuItems
                  )}
                  detail="Requires Admin review"
                />

                <Metric
                  label="New Customers"
                  value={number(
                    overview.newCustomers
                  )}
                  detail={`Last ${days} days`}
                />

                <div className="rounded-2xl border border-[#351010] bg-[#141414] p-5 sm:col-span-2">
                  <h2 className="font-bold">
                    Paid Premium Subscription Revenue
                  </h2>

                  {(data.revenues ?? []).length === 0 ? (
                    <p className="mt-3 text-sm text-white/70">
                      No paid subscriptions in this period.
                    </p>
                  ) : (
                    data.revenues?.map((revenue) => (
                      <p
                        key={revenue.currency}
                        className="mt-3 text-xl font-bold"
                      >
                        {revenue.currency.toUpperCase()}{" "}
                        {(revenue.amountMinor / 100)
                          .toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        <span className="ml-2 text-xs font-normal text-white/70">
                          ({revenue.count} payments)
                        </span>
                      </p>
                    ))
                  )}
                </div>

              </div>
            )}

            <section
              id="orders"
              className="rounded-2xl border border-[#351010] bg-[#141414] p-5 shadow-sm"
            >

              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">

                <h2 className="text-lg font-bold">
                  Recent Orders
                </h2>

                <div className="flex gap-2">

                  <label className="flex items-center gap-2 rounded-lg border border-[#351010] px-3">
                    <Search size={16} />

                    <input
                      type="search"
                      value={search}
                      onChange={(e) =>
                        setSearch(e.target.value)
                      }
                      placeholder="Search orders"
                      className="w-28 bg-transparent py-2 text-xs outline-none sm:w-44"
                    />
                  </label>

                  <select
                    value={status}
                    onChange={(e) =>
                      setStatus(e.target.value)
                    }
                    aria-label="Filter order status"
                    className="rounded-lg border border-[#351010] px-3 py-2 text-xs"
                  >
                    <option value="all">All</option>
                    <option value="pending">Pending</option>
                    <option value="accepted">Accepted</option>
                    <option value="rejected">Rejected</option>
                    <option value="cancelled">Cancelled</option>
                  </select>

                </div>

              </div>

              <div className="overflow-x-auto">

                <table className="w-full min-w-[650px] text-left text-sm">

                  <thead className="bg-[#101010] text-xs text-white/70">
                    <tr>
                      <th className="p-3">Order ID</th>
                      <th className="p-3">Restaurant</th>
                      <th className="p-3">Customer</th>
                      <th className="p-3">Pizza</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>

                  <tbody>

                    {orders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-[#351010]"
                      >
                        <td className="p-3 font-mono text-xs">
                          #{order.id.slice(-8)}
                        </td>

                        <td className="p-3">
                          {order.restaurant ??
                            data.vendor?.name ??
                            "Restaurant"}
                        </td>

                        <td className="p-3">
                          {order.customer}
                        </td>

                        <td className="p-3">
                          {order.itemName}
                        </td>

                        <td className="p-3">
                          <span className="rounded-full bg-[#1C0808] px-3 py-1 text-xs font-semibold capitalize">
                            {order.status}
                          </span>
                        </td>

                        <td className="p-3 text-xs text-white/70">
                          {new Date(
                            order.createdAt
                          ).toLocaleDateString("en-BD")}
                        </td>
                      </tr>
                    ))}

                    {orders.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-white/50"
                        >
                          No matching orders.
                        </td>
                      </tr>
                    )}

                  </tbody>
                </table>

              </div>

            </section>

            <p className="text-center text-xs text-white/50">
              PizzaHub | Your business, your performance, all in one place
            </p>

          </div>
        )}

      </section>

    </main>
  );
}
