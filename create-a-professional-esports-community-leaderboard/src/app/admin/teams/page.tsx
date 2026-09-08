import { redirect } from "next/navigation";

export default function AdminTeamsRoute() {
  redirect("/admin?tab=teams");
}
