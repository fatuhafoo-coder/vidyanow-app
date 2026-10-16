import "./globals.css";
export const metadata = { title: "VidyaNow", description: "Verified home tutors at your doorstep" };
export const viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#2563eb" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body className="bg-slate-950 antialiased">{children}</body></html>;
}
