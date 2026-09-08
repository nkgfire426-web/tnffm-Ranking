import { redirect } from "next/navigation";

export default function AdminResultsRoute() {
  redirect("/admin?tab=ranking");
}
