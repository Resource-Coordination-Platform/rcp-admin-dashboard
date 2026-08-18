import type { Metadata } from "next";
//@ts-ignore
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "RCP Admin Resource Coordination Platform",
  description:
    "Tenant admin dashboard for coordinating relief: requests, inventory, volunteers and disaster response.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
