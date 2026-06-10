import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Resumify — Jake's Resume Template, AI-Powered",
  description: "Upload your resume in any format. AI converts it to the cleanest LaTeX resume template on the internet. Edit, chat, download.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
