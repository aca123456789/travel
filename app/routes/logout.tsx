import type { LoaderFunction } from "@remix-run/node";
import { logout } from "~/services/auth.server";

export const loader: LoaderFunction = async ({ request }) => {
  return logout(request);
};

// No component export - this is just a redirect route 
 