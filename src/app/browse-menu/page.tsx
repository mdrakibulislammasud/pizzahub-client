import { redirect } from "next/navigation";

/** Keep one canonical menu route so both navigation URLs show the same live menu. */
export default function BrowseMenuPage() {
  redirect("/menu");
}
