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
      <nav className="neo-nav" style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
        <a href="/" className="neo-btn neo-btn-secondary neo-btn-compact" style={{ padding: "0.4rem 0.8rem", fontSize: "0.9rem" }}>
          <span className="desktop-only">{t("navbar.home")}</span>
          <span className="mobile-only">🏠</span>
        </a>
        
        {/* Selector for Language - Redesigned for maximum visibility */}
        <div style={{ 
          display: "flex", 
          border: "var(--border-thin)", 
          borderRadius: "8px", 
          overflow: "hidden", 
          boxShadow: "3px 3px 0px 0px var(--shadow-color)",
          backgroundColor: "#ffffff"
        }}>
          <button
            onClick={() => setLanguage("fr")}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.85rem",
              fontWeight: 800,
              cursor: "pointer",
              border: "none",
              backgroundColor: language === "fr" ? "var(--color-yellow)" : "#ffffff",
              color: "var(--foreground)",
              outline: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "background-color 0.2s ease"
            }}
            title="Français"
          >
            FR 🇫🇷
          </button>
          <button
            onClick={() => setLanguage("en")}
            style={{
              padding: "0.4rem 0.8rem",
              fontSize: "0.85rem",
              fontWeight: 800,
              cursor: "pointer",
              border: "none",
              borderLeft: "2px solid var(--border-color)",
              backgroundColor: language === "en" ? "var(--color-yellow)" : "#ffffff",
              color: "var(--foreground)",
              outline: "none",
              display: "flex",
              alignItems: "center",
              gap: "4px",
              transition: "background-color 0.2s ease"
            }}
            title="English"
          >
            EN 🇬🇧
          </button>
        </div>
      </nav>
    </header>
  );
}
