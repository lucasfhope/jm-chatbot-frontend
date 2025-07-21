import type { Metadata } from "next";
import {ReactNode} from "react";
import Header from "@/components/Header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Price Analyzer",
}

export default function RootLayout( props: {children: ReactNode} ) {
  return (
    <html lang="en">
      <body className="bg-gray-100">
        {props.children}
      </body>
    </html>
  );
}
