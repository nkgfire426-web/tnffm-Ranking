import { redirect } from "next/navigation";

export default function AdminCollaboratorsRoute() {
  redirect("/admin?tab=collaborators");
}
