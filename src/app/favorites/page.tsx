"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import {
  ArrowLeft,
  ArrowRight,
  Heart,
  LoaderCircle,
  MapPin,
  ShoppingBag,
  Trash2,
} from "lucide-react";

import { toast } from "sonner";

const API = (
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:5000"
).replace(/\/+$/, "");

interface Account {
  id: string;
  role: string;
  isBlocked?: boolean;
}

interface MenuItem {
  _id: string;
  itemName: string;
  description: string;
  category: string;
  price: number;
  location: string;
  images: string[];
  vendor?: {
    name?: string;
    businessName?: string;
  } | null;
  isPremiumVendor?: boolean;
}

export default function FavoritesPage() {
  const router = useRouter();

  const [user, setUser] = useState<Account | null>(null);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadFavorites() {
      try {
        const response = await fetch(
          `${API}/api/auth/get-session`,
          {
            credentials: "include",
            cache: "no-store",
          }
        );

        const session = await response
          .json()
          .catch(() => null);

        const account = session?.user as Account | undefined;

        if (!response.ok || !account) {
          router.replace("/sign-in");
          return;
        }

        if (
          account.role !== "customer" ||
          account.isBlocked
        ) {
          throw new Error(
            "Only active customer accounts can access favorites."
          );
        }

        if (cancelled) return;

        setUser(account);

        const key =
          `pizzahub-favorites:${account.id}`;

        let ids: string[] = [];

        try {
          const stored = JSON.parse(
            localStorage.getItem(key) || "[]"
          ) as unknown;

          if (Array.isArray(stored)) {
            ids = [
              ...new Set(
                stored.filter(
                  (id): id is string =>
                    typeof id === "string" &&
                    /^[0-9a-f]{24}$/i.test(id)
                )
              ),
            ].slice(0, 100);
          }
        } catch {
          ids = [];
        }

        setSavedCount(ids.length);

        if (!ids.length) {
          return;
        }

        // Load each saved pizza from the real API.
        // No placeholder products.

        const results = await Promise.all(
          ids.map(async id => {
            try {
              const itemResponse = await fetch(
                `${API}/api/menu/${encodeURIComponent(id)}`,
                {
                  cache: "no-store",
                }
              );

              if (!itemResponse.ok) return null;

              const data = await itemResponse.json();

              return data.success && data.data
                ? (data.data as MenuItem)
                : null;
            } catch {
              return null;
            }
          })
        );

        if (!cancelled) {
          setItems(
            results.filter(
              (item): item is MenuItem =>
                item !== null
            )
          );
        }

      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "Unable to load favorites."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadFavorites();

    return () => {
      cancelled = true;
    };
  }, [router]);

  function removeFavorite(itemId: string) {
    if (!user) return;

    const key = `pizzahub-favorites:${user.id}`;

    let ids: string[] = [];

    try {
      const stored = JSON.parse(
        localStorage.getItem(key) || "[]"
      ) as unknown;

      if (Array.isArray(stored)) {
        ids = stored.filter(
          (id): id is string =>
            typeof id === "string"
        );
      }
    } catch {
      ids = [];
    }

    const updated = ids.filter(
      id => id !== itemId
    );

    localStorage.setItem(
      key,
      JSON.stringify(updated)
    );

    setItems(previous =>
      previous.filter(item => item._id !== itemId)
    );

    setSavedCount(updated.length);

    toast.success("Removed from Favorites.");
  }

  return (
    <main className="min-h-screen bg-[#080808] px-4 py-8 text-white sm:px-6 sm:py-12">

      <div className="mx-auto max-w-7xl">

        <div className="flex flex-wrap items-center justify-between gap-4">

          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-white/70 hover:text-white"
          >
            <ArrowLeft size={18} />
            Back to Home
          </Link>

          <Link
            href="/menu"
            className="inline-flex items-center gap-2 rounded-xl border border-red-800/50 px-4 py-2 text-sm font-semibold text-white hover:bg-red-900/20"
          >
            Browse Menu
            <ArrowRight size={17} />
          </Link>

        </div>

        <div className="mt-10">

          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#E51B23]">
            PizzaHub Customer
          </p>

          <h1 className="mt-3 flex flex-wrap items-center gap-3 font-serif text-3xl font-bold sm:text-5xl">
            <Heart
              className="text-[#E51B23]"
              size={36}
            />
            My Favorites
          </h1>

          <p className="mt-4 text-sm leading-7 text-white/65">
            Your saved pizzas, all in one place.
          </p>

        </div>

        {loading ? (
          <div className="grid min-h-64 place-items-center">
            <div className="text-center">
              <LoaderCircle
                size={35}
                className="mx-auto animate-spin text-[#E51B23]"
              />
              <p className="mt-4 text-sm text-white/60">
                Loading Favorites...
              </p>
            </div>
          </div>
        ) : error ? (
          <div
            role="alert"
            className="mt-8 rounded-2xl border border-red-900/50 bg-[#151515] p-6 text-red-200"
          >
            {error}
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-[#351010] bg-[#121212] p-10 text-center">

            <ShoppingBag
              size={46}
              className="mx-auto text-[#E51B23]"
            />

            <h2 className="mt-5 text-xl font-bold">
              {savedCount
                ? "Saved pizzas are currently unavailable"
                : "No favorites yet"}
            </h2>

            <p className="mt-3 text-sm text-white/60">
              {savedCount
                ? "Some saved pizzas may be unavailable or the server may be unreachable."
                : "Explore our menu and save pizzas you like."}
            </p>

            <Link
              href="/menu"
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#C9151B] px-6 py-3 font-bold text-white"
            >
              Explore Menu
              <ArrowRight size={17} />
            </Link>

          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">

            {items.map(item => (
              <article
                key={item._id}
                className="overflow-hidden rounded-2xl border border-[#351010] bg-[#141414]"
              >

                <div className="aspect-[5/4] overflow-hidden bg-[#240B0B]">
                  {item.images?.[0] ? (
                    <img
                      src={item.images[0]}
                      alt={item.itemName}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  ) : (
                    <div className="grid h-full place-items-center text-white/40">
                      No Image
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-5">

                  {item.isPremiumVendor && (
                    <span className="inline-block rounded-full border border-amber-700/50 px-3 py-1 text-xs font-bold text-amber-300">
                      Premium Restaurant
                    </span>
                  )}

                  <h2 className="line-clamp-2 text-lg font-bold">
                    {item.itemName}
                  </h2>

                  <p className="flex items-center gap-2 text-xs text-white/55">
                    <MapPin size={14} />
                    {item.location}
                  </p>

                  {(item.vendor?.businessName ||
                    item.vendor?.name) && (
                    <p className="text-xs text-white/60">
                      {item.vendor.businessName ||
                        item.vendor.name}
                    </p>
                  )}

                  <p className="text-xl font-extrabold text-[#FF4545]">
                    ?{Number(item.price).toLocaleString("en-BD")}
                  </p>

                  <Link
                    href={`/menu/${encodeURIComponent(item._id)}`}
                    className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#C9151B] px-4 text-sm font-bold text-white hover:bg-[#E51B23]"
                  >
                    View Details
                    <ArrowRight size={17} />
                  </Link>

                  <button
                    type="button"
                    onClick={() => removeFavorite(item._id)}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 px-4 py-3 text-xs font-semibold text-white/75 hover:border-red-600 hover:text-red-400"
                  >
                    <Trash2 size={16} />
                    Remove Favorite
                  </button>

                </div>

              </article>
            ))}

          </div>
        )}

      </div>
    </main>
  );
}
