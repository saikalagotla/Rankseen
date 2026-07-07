import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "./components/theme-provider";
import { AuthProvider } from "./components/auth-provider";
import MixpanelProvider from "./components/mixpanel-provider";
import { getCurrentUser } from "@/lib/auth";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SpottedHQ — Local SEO & AI Visibility",
  description: "Track your Google Maps rank, AI visibility, and citation health in one place. The weekly local SEO report built for business owners.",
  icons: { icon: "/tabLogo.svg", shortcut: "/tabLogo.svg" },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getCurrentUser();

  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Blocking script: apply dark class before first paint to prevent flash */}
        <script dangerouslySetInnerHTML={{ __html: `(function(){try{var t=localStorage.getItem('spottedhq_theme');var dark=t==='dark'||((!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches);if(dark)document.documentElement.classList.add('dark');}catch(e){}})();` }} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <AuthProvider initialUser={user}>
          <ThemeProvider>
            <MixpanelProvider />
            {children}
          </ThemeProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
