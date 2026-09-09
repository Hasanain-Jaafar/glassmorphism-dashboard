import type { Metadata } from "next";
import { Geist, Geist_Mono, Zain } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Arabic-script font for AI Brain replies (components/assistant/chat-thread.tsx)
// — Geist has no Arabic glyphs, so Arabic falls back to the OS default there.
const zain = Zain({
  variable: "--font-zain",
  subsets: ["arabic"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Sales Dashboard",
  description: "Internal sales management dashboard.",
  icons: {
    icon: [
      { url: "/new.svg", type: "image/svg+xml" },
      { url: "/favicon48x48.png", sizes: "48x48", type: "image/png" },
      { url: "/favicon128x128.png", sizes: "128x128", type: "image/png" },
    ],
    shortcut: "/favicon48x48.png",
    apple: "/favicon128x128.png",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${zain.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Blocking, runs before hydration — applies the saved accent color
            (Settings > Appearance, lib/use-accent-color.ts) immediately so
            there's no flash of the default violet on load. Mirrors what
            next-themes does internally for the dark/light class below. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var a=localStorage.getItem("accent-color");if(a==="blue"||a==="teal"||a==="amber")document.documentElement.dataset.accent=a}catch(e){}`,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <TooltipProvider delay={200}>
            {children}
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
