import { redirect } from "next/navigation";

/** Legacy URL kept for old bookmarks. */
export default function LegacySuperAdmin() {
  redirect("/admin");
}
