import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction } from "@remix-run/node";
import "~/styles/tailwind.css";

export const links: LinksFunction = () => [
  { rel: "icon", href: "/favicon.ico" },
  // Add Google Fonts (Inter)
  {
    rel: "stylesheet",
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap",
  },
];

export default function App() {
  return (
    <html lang="zh-CN">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body>
        <Outlet />
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

// Handle errors gracefully
export function ErrorBoundary() {
  return (
    <html lang="zh-CN">
      <head>
        <title>Oh no!</title>
        <Meta />
        <Links />
      </head>
      <body>
        <div className="error-container">
          <h1>Something went wrong</h1>
          <p>Sorry, we encountered an unexpected error.</p>
        </div>
        <Scripts />
      </body>
    </html>
  );
}
