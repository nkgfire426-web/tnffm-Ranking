import { redirect } from "next/navigation";

export default function AdminRankingsRoute() {
  redirect("/admin?tab=ranking");
}
