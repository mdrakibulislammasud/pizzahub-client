"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Star, LoaderCircle, Send } from "lucide-react";
import { toast } from "sonner";

const API = (
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000"
).replace(/\/$/, "");

interface Review {
  reviewerId: string;
  reviewerName: string;
  reviewerImage?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface ReviewStats {
  reviews: Review[];
  averageRating: number;
  totalReviews: number;
}

interface Props {
  itemId: string;
  vendorId: string;
  user: {
    role: string;
    isBlocked?: boolean;
  } | null;
}

const emptyStats: ReviewStats = {
  reviews: [],
  averageRating: 0,
  totalReviews: 0,
};

function extractStats(payload: any): ReviewStats {
  const data = payload?.data ?? payload ?? {};

  return {
    reviews: Array.isArray(data.reviews) ? data.reviews : [],
    averageRating: Number(data.averageRating) || 0,
    totalReviews: Number(data.totalReviews) || 0,
  };
}

function Stars({
  value,
  interactive = false,
  onChange,
}: {
  value: number;
  interactive?: boolean;
  onChange?: (rating: number) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) =>
        interactive ? (
          <button
            key={star}
            type="button"
            aria-label={`Rate ${star} out of 5`}
            onClick={() => onChange?.(star)}
          >
            <Star
              size={22}
              className={
                star <= value
                  ? "fill-[#FFB800] text-[#FFB800]"
                  : "text-gray-600"
              }
            />
          </button>
        ) : (
          <Star
            key={star}
            size={16}
            className={
              star <= value
                ? "fill-[#FFB800] text-[#FFB800]"
                : "text-gray-600"
            }
          />
        )
      )}
    </div>
  );
}

function ReviewCard({ review }: { review: Review }) {
  return (
    <article className="rounded-xl border border-[#351010] bg-[#101010] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {review.reviewerImage ? (
            <img
              src={review.reviewerImage}
              alt=""
              className="h-10 w-10 rounded-full object-cover"
            />
          ) : (
            <div className="grid h-10 w-10 place-items-center rounded-full bg-[#351010] font-bold">
              {(review.reviewerName || "C").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-semibold">
              {review.reviewerName || "Customer"}
            </p>
            <p className="text-xs text-gray-500">
              {review.createdAt
                ? new Date(review.createdAt).toLocaleDateString()
                : ""}
            </p>
          </div>
        </div>
        <Stars value={review.rating} />
      </div>
      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-gray-300">
        {review.comment}
      </p>
    </article>
  );
}

export default function ReviewSection({
  itemId,
  vendorId,
  user,
}: Props) {
  const [itemStats, setItemStats] = useState(emptyStats);
  const [restaurantStats, setRestaurantStats] = useState(emptyStats);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState<"item" | "restaurant" | null>(null);

  const [itemRating, setItemRating] = useState(5);
  const [restaurantRating, setRestaurantRating] = useState(5);
  const [itemComment, setItemComment] = useState("");
  const [restaurantComment, setRestaurantComment] = useState("");

  async function loadReviews() {
    setLoading(true);

    try {
      const [itemResponse, restaurantResponse] = await Promise.all([
        fetch(`${API}/api/menu/${encodeURIComponent(itemId)}/reviews`, {
          cache: "no-store",
        }),
        fetch(
          `${API}/api/menu/restaurant/${encodeURIComponent(vendorId)}/reviews`,
          { cache: "no-store" }
        ),
      ]);

      if (!itemResponse.ok || !restaurantResponse.ok) {
        throw new Error("Unable to load reviews.");
      }

      const [itemData, restaurantData] = await Promise.all([
        itemResponse.json(),
        restaurantResponse.json(),
      ]);

      setItemStats(extractStats(itemData));
      setRestaurantStats(extractStats(restaurantData));
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to load reviews."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (itemId && vendorId) {
      loadReviews();
    }
    // loadReviews is intentionally triggered when the item/vendor changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemId, vendorId]);

  async function submitReview(
    event: FormEvent<HTMLFormElement>,
    type: "item" | "restaurant"
  ) {
    event.preventDefault();

    if (user?.role !== "customer" || user.isBlocked) {
      toast.error("Only active customer accounts can submit reviews.");
      return;
    }

    const comment = (
      type === "item" ? itemComment : restaurantComment
    ).trim();

    if (comment.length < 3 || comment.length > 500) {
      toast.error("Review must be between 3 and 500 characters.");
      return;
    }

    try {
      setSubmitting(type);

      const tokenResponse = await fetch(`${API}/api/auth/token`, {
        credentials: "include",
        cache: "no-store",
      });

      if (!tokenResponse.ok) {
        throw new Error("Unable to verify your session. Please sign in again.");
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData.token) {
        throw new Error("Authentication token not found.");
      }

      const endpoint =
        type === "item"
          ? `${API}/api/menu/${encodeURIComponent(itemId)}/reviews`
          : `${API}/api/menu/restaurant/${encodeURIComponent(vendorId)}/reviews`;

      const response = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${tokenData.token}`,
        },
        body: JSON.stringify({
          rating: type === "item" ? itemRating : restaurantRating,
          comment,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok || result?.success === false) {
        throw new Error(result?.message || "Unable to submit your review.");
      }

      toast.success("Your review has been submitted!");

      if (type === "item") {
        setItemComment("");
        setItemRating(5);
      } else {
        setRestaurantComment("");
        setRestaurantRating(5);
      }

      await loadReviews();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to submit review."
      );
    } finally {
      setSubmitting(null);
    }
  }

  function ReviewForm({
    type,
    rating,
    setRating,
    comment,
    setComment,
  }: {
    type: "item" | "restaurant";
    rating: number;
    setRating: (value: number) => void;
    comment: string;
    setComment: (value: string) => void;
  }) {
    return (
      <form
        onSubmit={(event) => submitReview(event, type)}
        className="mt-5 rounded-xl border border-[#351010] bg-[#101010] p-5"
      >
        <label className="mb-3 block text-sm font-semibold">
          Your rating
        </label>
        <Stars value={rating} interactive onChange={setRating} />

        <label className="mb-2 mt-5 block text-sm font-semibold">
          Your review
        </label>
        <textarea
          required
          minLength={3}
          maxLength={500}
          rows={3}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Share your experience..."
          className="w-full resize-y rounded-xl border border-[#351010] bg-[#080808] p-3 text-white outline-none focus:border-[#E51B23]"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-500">
            {comment.length}/500 characters
          </span>
          <button
            type="submit"
            disabled={submitting !== null}
            className="inline-flex items-center gap-2 rounded-lg bg-[#C9151B] px-5 py-3 text-sm font-bold hover:bg-[#E51B23] disabled:opacity-50"
          >
            {submitting === type ? (
              <LoaderCircle size={17} className="animate-spin" />
            ) : (
              <Send size={16} />
            )}
            {submitting === type ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </form>
    );
  }

  function ReviewGroup({
    title,
    stats,
    type,
    rating,
    setRating,
    comment,
    setComment,
  }: {
    title: string;
    stats: ReviewStats;
    type: "item" | "restaurant";
    rating: number;
    setRating: (value: number) => void;
    comment: string;
    setComment: (value: string) => void;
  }) {
    return (
      <section className="rounded-2xl border border-[#351010] bg-[#141414] p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="font-serif text-2xl font-bold">{title}</h3>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-[#FFB800]">
              {stats.averageRating.toFixed(1)}
            </span>
            <div>
              <Stars value={Math.round(stats.averageRating)} />
              <p className="mt-1 text-xs text-gray-400">
                {stats.totalReviews} reviews
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <LoaderCircle className="animate-spin text-[#E51B23]" size={28} />
          </div>
        ) : stats.reviews.length ? (
          <div className="mt-6 space-y-3">
            {stats.reviews.map((review, index) => (
              <ReviewCard
                key={`${review.reviewerId}-${index}`}
                review={review}
              />
            ))}
          </div>
        ) : (
          <p className="mt-6 rounded-xl bg-[#101010] p-5 text-center text-sm text-gray-400">
            No reviews yet. Be the first to share your experience!
          </p>
        )}

        {user?.role === "customer" && !user.isBlocked && (
          <ReviewForm
            type={type}
            rating={rating}
            setRating={setRating}
            comment={comment}
            setComment={setComment}
          />
        )}

        {!user && (
          <p className="mt-5 text-sm text-gray-400">
            Sign in as a customer to submit a review.
          </p>
        )}
      </section>
    );
  }

  return (
    <section className="mt-14 space-y-8">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#FF4545]">
          Customer feedback
        </p>
        <h2 className="mt-2 font-serif text-3xl font-bold sm:text-4xl">
          Reviews & Ratings
        </h2>
        <p className="mt-2 text-gray-400">
          Honest experiences from our PizzaHub customers.
        </p>
      </div>

      <ReviewGroup
        title="Menu Item Reviews"
        stats={itemStats}
        type="item"
        rating={itemRating}
        setRating={setItemRating}
        comment={itemComment}
        setComment={setItemComment}
      />

      <ReviewGroup
        title="Restaurant Reviews"
        stats={restaurantStats}
        type="restaurant"
        rating={restaurantRating}
        setRating={setRestaurantRating}
        comment={restaurantComment}
        setComment={setRestaurantComment}
      />
    </section>
  );
}
