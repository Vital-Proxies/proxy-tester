"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme={useTheme().theme === "dark" ? "dark" : "light"}
      className="toaster group"
      style={
        {
          // Normal toast - soft glass effect
          "--normal-bg": "rgba(255, 255, 255, 0.05)",
          "--normal-text": "rgb(229, 231, 235)", // gray-200
          "--normal-border": "rgba(255, 255, 255, 0.1)",

          // Success - soft green with gentle text
          "--success-bg": "rgba(34, 197, 94, 0.1)", // green-500/10
          "--success-text": "rgb(134, 239, 172)", // green-300
          "--success-border": "rgba(34, 197, 94, 0.2)", // green-500/20

          // Error - soft red with gentle text
          "--error-bg": "rgba(239, 68, 68, 0.1)", // red-500/10
          "--error-text": "rgb(252, 165, 165)", // red-300
          "--error-border": "rgba(239, 68, 68, 0.2)", // red-500/20

          // Info - soft blue with gentle text
          "--info-bg": "rgba(59, 130, 246, 0.1)", // blue-500/10
          "--info-text": "rgb(147, 197, 253)", // blue-300
          "--info-border": "rgba(59, 130, 246, 0.2)", // blue-500/20

          // Warning - soft orange with gentle text
          "--warning-bg": "rgba(249, 115, 22, 0.1)", // orange-500/10
          "--warning-text": "rgb(253, 186, 116)", // orange-300
          "--warning-border": "rgba(249, 115, 22, 0.2)", // orange-500/20
        } as React.CSSProperties
      }
      toastOptions={{
        style: {
          backdropFilter: "blur(12px)",
          borderRadius: "0.75rem", // rounded-xl
          border: "1px solid var(--normal-border)",
          boxShadow:
            "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
        },
        className: "group toast backdrop-blur-xl",
      }}
      position="top-right"
      duration={4000}
      {...props}
    />
  );
};

export { Toaster };
