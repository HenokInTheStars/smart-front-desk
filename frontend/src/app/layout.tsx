import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Smart Front Desk",
  description: "Next-generation visitor management system.",
};

import { Providers } from "@/app/providers";
import StyledComponentsRegistry from "@/app/registry";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className="font-sans h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <StyledComponentsRegistry>
          <Providers>{children}</Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
