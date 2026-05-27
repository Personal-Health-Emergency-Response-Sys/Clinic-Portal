import { redirect } from "next/navigation";

/**
 * Legacy redirect: the old "Deactivate Account" nav item was repurposed
 * into a full Users management page at /admin/users. Any old bookmark
 * pointing at /admin/deactivate now lands on Users.
 */
export default function AdminDeactivateRedirect() {
  redirect("/admin/users");
}
