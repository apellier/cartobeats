"use client";

import React from "react";
import { useTranslation } from "@/context/LanguageContext";

export default function Navbar() {
  const { language, setLanguage, t } = useTranslation();

  return (
    <header className="neo-navbar">
      <a href="/" className="neo-brand">
        CARTOBEAT
      </a>
      <nav style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <a href="/" className="neo-btn neo-btn-secondary" style={{ padding: "0.4rem 0.8rem", fontSize: "0.9rem" }}>
          {t("navbar.home")}
        </a>
        
        {/* Selector for Language */}
        <div style={{ 
          display: "flex", 
          border: "var(--border-thin)", 
          borderRadius: "6px", 
          overflow: "hidden", 
          boxShadow: "1.5px 1.5px 0px 0px #1c1917" 
        }}>
          <button
            onClick={() => setLanguage("fr")}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: "bold",
              cursor: "pointer",
              border: "none",
              backgroundColor: language === "fr" ? "var(--color-pink)" : "#ffffff",
              color: "var(--foreground)",
              outline: "none"
            }}
          >
            FR
          </button>
          <button
            onClick={() => setLanguage("en")}
            style={{
              padding: "0.25rem 0.5rem",
              fontSize: "0.75rem",
              fontWeight: "bold",
              cursor: "pointer",
              border: "none",
              borderLeft: "1.5px solid #1c1917",
              backgroundColor: language === "en" ? "var(--color-pink)" : "#ffffff",
              color: "var(--foreground)",
              outline: "none"
            }}
          >
            EN
          </button>
        </div>
      </nav>
    </header>
  );
}
