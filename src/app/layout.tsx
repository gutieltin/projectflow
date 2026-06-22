import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { NotificationProvider } from "@/context/NotificationContext";
import { NotificationContainer } from "@/components/NotificationContainer";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ProjectFlow",
  description: "Your project management workspace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={geist.className}>
        {/* AuthProvider wraps everything so every page has access to the logged-in user */}
        <AuthProvider>
          {/* NotificationProvider wraps the app for in-app notifications */}
          <NotificationProvider>
            <NotificationContainer />
            {children}
          </NotificationProvider>
        </AuthProvider>
      </body>
    </html>
  );
}