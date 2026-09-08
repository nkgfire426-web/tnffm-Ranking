import { redirect } from "next/navigation";

export default function AdminEventsRoute() {
  redirect("/admin?tab=events");
}
