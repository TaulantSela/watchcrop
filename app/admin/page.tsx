import { redirect } from "next/navigation";

/** /admin is the obvious URL to type; the admin lives at /admin/crop. */
export default function AdminIndex() {
  redirect("/admin/crop");
}
