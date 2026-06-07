import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RecallZero",
  description:
    "RecallZero is a recall-response platform for tracing defective lots and coordinating remediation across operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
