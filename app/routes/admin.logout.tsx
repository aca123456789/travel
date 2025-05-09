import { type LoaderFunctionArgs } from "@remix-run/node";
import { logoutAdmin } from "~/services/admin.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  return logoutAdmin(request);
};

export default function AdminLogout() {
  return null;
} 
