import "./css/theme.css";
import "./css/globals.css";
import { AuthProviderWrapper } from "./providers";

export const metadata = {
  title: "Kiza",
  description: "RFP document management, search, and audit",
  icons: {
    icon: "/kizaheaderlogo.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/kizaheaderlogo.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Geist:wght@100..900&family=Geist+Mono:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <style dangerouslySetInnerHTML={{
          __html: `:root{--font-geist-sans:'Geist',system-ui,sans-serif;--font-geist-mono:'Geist Mono',monospace}`,
        }} />
      </head>
      <body suppressHydrationWarning>
        <AuthProviderWrapper>{children}</AuthProviderWrapper>
      </body>
    </html>
  );
}
