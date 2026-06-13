"use client";

import React from "react";

interface DoubleRangeSliderProps {
  min: number;
  max: number;
  minValue: number;
  maxValue: number;
  step?: number;
  onChange: (min: number, max: number) => void;
  accentColor?: string;
}

export default function DoubleRangeSlider({
  min,
  max,
  minValue,
  maxValue,
  step = 1,
  onChange,
  accentColor = "var(--color-pink)"
}: DoubleRangeSliderProps) {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.min(Number(e.target.value), maxValue - step);
    onChange(value, maxValue);
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Math.max(Number(e.target.value), minValue + step);
    onChange(minValue, value);
  };

  const minPercent = ((minValue - min) / (max - min)) * 100;
  const maxPercent = ((maxValue - min) / (max - min)) * 100;

  return (
    <div style={{ position: "relative", width: "100%", height: "24px", display: "flex", alignItems: "center" }}>
      {/* Base Track */}
      <div style={{
        position: "absolute",
        left: 0,
        right: 0,
        height: "6px",
        borderRadius: "3px",
        backgroundColor: "#e2e8f0",
        border: "1.5px solid #1c1917",
        zIndex: 1
      }} />
      
      {/* Range Highlight */}
      <div style={{
        position: "absolute",
        left: `${minPercent}%`,
        width: `${maxPercent - minPercent}%`,
        height: "6px",
        backgroundColor: accentColor,
        zIndex: 2,
        borderRadius: "3px"
      }} />

      {/* Inputs overlay */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={minValue}
        onChange={handleMinChange}
        style={{
          position: "absolute",
          width: "100%",
          height: "0",
          outline: "none",
          background: "none",
          pointerEvents: "none",
          WebkitAppearance: "none",
          zIndex: 3
        }}
        className="double-range-slider-input"
      />
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={maxValue}
        onChange={handleMaxChange}
        style={{
          position: "absolute",
          width: "100%",
          height: "0",
          outline: "none",
          background: "none",
          pointerEvents: "none",
          WebkitAppearance: "none",
          zIndex: 4
        }}
        className="double-range-slider-input"
      />

      <style jsx global>{`
        .double-range-slider-input::-webkit-slider-thumb {
          pointer-events: auto;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #1c1917;
          cursor: pointer;
          -webkit-appearance: none;
          box-shadow: 1px 1px 0px 0px #1c1917;
          transition: transform 0.1s ease;
        }
        .double-range-slider-input::-webkit-slider-thumb:hover {
          transform: scale(1.15);
        }
        .double-range-slider-input::-moz-range-thumb {
          pointer-events: auto;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: #ffffff;
          border: 2px solid #1c1917;
          cursor: pointer;
          box-shadow: 1px 1px 0px 0px #1c1917;
        }
      `}</style>
    </div>
  );
}
