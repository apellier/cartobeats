// src/components/MapOrigines.tsx
"use client";

import React, { useEffect, useRef, useState, useMemo } from "react";
import * as d3 from "d3";
import { useTranslation } from "@/context/LanguageContext";
import { createPortal } from "react-dom";
import "ol/ol.css";
import OlMap from "ol/Map";
import View from "ol/View";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import GeoJSON from "ol/format/GeoJSON";
import Feature, { FeatureLike } from "ol/Feature";
import { Geometry } from "ol/geom";
import { Fill, Stroke, Style } from "ol/style";
import Overlay from "ol/Overlay";
import { MapBrowserEvent } from "ol";

interface Track {
  id: string;
  name: string;
  artists: string;
  primaryArtist?: string | null;
  [key: string]: any;
}

interface MapOriginesProps {
  countrySongCounts: Record<string, number>;
  onCountryClick: (isoCode: string | null, countryName: string) => void;
  selectedCountry: string | null;
  tracks?: Track[];
  artistCountries?: Record<string, string | null>;
  onTrackSelect?: (track: any) => void;
  selectedTrack?: Track | null;
}

interface TooltipInfo {
  visible: boolean;
  content: string;
  x: number;
  y: number;
}

const MapOrigines: React.FC<MapOriginesProps> = ({
  countrySongCounts,
  onCountryClick,
  selectedCountry,
  tracks = [],
  artistCountries = {},
  onTrackSelect,
  selectedTrack,
}) => {
  const { t, language } = useTranslation();
  const mapElement = useRef<HTMLDivElement>(null);
  const popupElement = useRef<HTMLDivElement>(null);
  
  const mapRef = useRef<OlMap | null>(null);
  const vectorLayerRef = useRef<VectorLayer<VectorSource<Feature<Geometry>>> | null>(null);
  const overlayRef = useRef<Overlay | null>(null);

  const [tooltip, setTooltip] = useState<TooltipInfo>({ visible: false, content: "", x: 0, y: 0 });
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setIsMobile(window.matchMedia("(max-width: 767px)").matches);
      setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
      
      const media = window.matchMedia("(max-width: 767px)");
      const listener = (e: MediaQueryListEvent) => setIsMobile(e.matches);
      media.addEventListener("change", listener);
      return () => media.removeEventListener("change", listener);
    }
  }, []);

  // 1. Calculate max count to define dynamic thresholds
  const maxCount = useMemo(() => {
    const counts = Object.values(countrySongCounts);
    return counts.length > 0 ? Math.max(...counts) : 0;
  }, [countrySongCounts]);

  // 2. Log-scale color helper (exact port from spotimap's D3 scaleLog)
  const getCountryColor = (count: number, maxVal: number): string => {
    if (count === 0 || maxVal === 0) {
      return "rgba(200, 200, 200, 0.6)"; // Default light grey for empty/0 countries
    }

    const safeMaxCount = Math.max(1, maxVal);
    const midPoint = Math.sqrt(safeMaxCount);

    let domainPoints = [1, safeMaxCount];
    if (midPoint > 1 && midPoint < safeMaxCount) {
      domainPoints = [1, midPoint, safeMaxCount];
    } else if (safeMaxCount === 1) {
      domainPoints = [1, 1.00001];
    }

    domainPoints = [...new Set(domainPoints)].sort((a, b) => a - b);
    if (domainPoints.length === 1 && domainPoints[0] === 1 && safeMaxCount === 1) {
      domainPoints = [1, 1.00001];
    } else if (domainPoints.length === 1 && domainPoints[0] > 1) {
      domainPoints.unshift(1);
    }

    let colorRange = ["#C7F9CC", "#1ED760", "#00441B"];
    if (domainPoints.length < 2) {
      colorRange = [colorRange[1]];
    } else if (domainPoints.length < 3) {
      colorRange = [colorRange[0], colorRange[1]];
    }

    const colorScale = d3.scaleLog<string, string>()
      .domain(domainPoints)
      .range(colorRange)
      .interpolate(d3.interpolateRgb)
      .clamp(true);

    const fillColor = colorScale(count);

    // Opacity calculation
    const minOpacity = 0.6;
    const maxOpacity = 0.85;

    const normalizedValue = safeMaxCount > 1 ? (Math.log10(count + 1) / Math.log10(safeMaxCount + 1)) : 1;
    const opacity = minOpacity + (maxOpacity - minOpacity) * Math.min(1, Math.max(0, normalizedValue));

    try {
      const d3ColorObject = d3.color(fillColor);
      if (d3ColorObject) {
        const rgbVersion = d3ColorObject.rgb();
        return `rgba(${rgbVersion.r}, ${rgbVersion.g}, ${rgbVersion.b}, ${opacity})`;
      } else {
        return `rgba(200, 200, 200, ${opacity})`;
      }
    } catch (e) {
      return `rgba(200, 200, 200, ${opacity})`;
    }
  };

  // 3. Compute legend ranges dynamically using our log-scale colors
  const legendRanges = useMemo(() => {
    const ranges = [
      { color: "rgba(200, 200, 200, 0.6)", text: language === "fr" ? "0 titre" : "0 tracks" }
    ];
    
    if (maxCount <= 0) return ranges;

    if (maxCount === 1) {
      ranges.push({ color: getCountryColor(1, maxCount), text: language === "fr" ? "1 titre" : "1 track" });
      return ranges;
    }

    if (maxCount <= 4) {
      for (let i = 1; i <= maxCount; i++) {
        ranges.push({
          color: getCountryColor(i, maxCount),
          text: language === "fr" ? `${i} titre${i > 1 ? "s" : ""}` : `${i} track${i > 1 ? "s" : ""}`
        });
      }
      return ranges;
    }

    // Dynamic steps using logarithmic spacing
    const mid1 = Math.max(2, Math.round(Math.pow(maxCount, 0.33)));
    const mid2 = Math.max(mid1 + 1, Math.round(Math.pow(maxCount, 0.67)));
    const safeMid2 = mid2 >= maxCount ? maxCount - 1 : mid2;
    
    const values = [1, mid1, safeMid2, maxCount];
    const uniqueValues = Array.from(new Set(values)).sort((a, b) => a - b);

    uniqueValues.forEach((val, index) => {
      const color = getCountryColor(val, maxCount);
      let text = "";
      if (val === 1) {
        text = language === "fr" ? "1 titre" : "1 track";
      } else if (index === uniqueValues.length - 1) {
        text = language === "fr" ? `${val}+ titres` : `${val}+ tracks`;
      } else {
        const nextVal = uniqueValues[index + 1];
        if (nextVal === val + 1) {
          text = language === "fr" ? `${val} titres` : `${val} tracks`;
        } else {
          text = language === "fr" ? `${val} - ${nextVal - 1} titres` : `${val} - ${nextVal - 1} tracks`;
        }
      }
      ranges.push({ color, text });
    });

    return ranges;
  }, [maxCount, language]);

  // References to keep event handlers in sync without re-creating listeners
  const onCountryClickRef = useRef(onCountryClick);
  useEffect(() => {
    onCountryClickRef.current = onCountryClick;
  }, [onCountryClick]);

  const countrySongCountsRef = useRef(countrySongCounts);
  useEffect(() => {
    countrySongCountsRef.current = countrySongCounts;
  }, [countrySongCounts]);

  const selectedCountryRef = useRef(selectedCountry);
  useEffect(() => {
    selectedCountryRef.current = selectedCountry;
  }, [selectedCountry]);

  // Compute translated selected country name
  const selectedCountryName = useMemo(() => {
    if (!selectedCountry) return "";
    try {
      const regionNames = new Intl.DisplayNames([language], { type: "region" });
      return regionNames.of(selectedCountry) || selectedCountry;
    } catch {
      return selectedCountry;
    }
  }, [selectedCountry, language]);

  // Filter tracks corresponding to the selected country
  const selectedCountryTracks = useMemo(() => {
    if (!selectedCountry || !tracks || !artistCountries) return [];
    return tracks.filter((track) => {
      const firstArtist = (track.primaryArtist || (track.artists ? track.artists.split(",")[0].trim() : "")).toLowerCase();
      const countryCode = artistCountries[firstArtist];
      return countryCode?.toUpperCase() === selectedCountry.toUpperCase();
    });
  }, [selectedCountry, tracks, artistCountries]);

  // Sync popup visibility from outside selections/resets
  useEffect(() => {
    if (!selectedCountry) {
      overlayRef.current?.setPosition(undefined);
    }
  }, [selectedCountry]);

  // Map initialization
  useEffect(() => {
    if (!mapElement.current || !popupElement.current) return;

    const initialVectorSource = new VectorSource<Feature<Geometry>>();
    const countriesLayer = new VectorLayer({
      source: initialVectorSource,
    });
    vectorLayerRef.current = countriesLayer;

    // Create OpenLayers Overlay for the click-to-view popup
    const popupOverlay = new Overlay({
      element: popupElement.current,
      autoPan: {
        animation: {
          duration: 250,
        },
      },
    });
    overlayRef.current = popupOverlay;

    // Initialize map with target directly (standard robust method)
    const initialMap = new OlMap({
      target: mapElement.current,
      layers: [countriesLayer],
      overlays: [popupOverlay],
      view: new View({
        center: [0, 0],
        zoom: 2,
        minZoom: 1.5,
        maxZoom: 8,
        projection: "EPSG:3857",
      }),
    });
    mapRef.current = initialMap;

    // Pointer move listener for tooltips
    initialMap.on("pointermove", (evt: MapBrowserEvent<any>) => {
      if (evt.dragging || !mapRef.current) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        if (mapElement.current) mapElement.current.style.cursor = "";
        return;
      }

      const pixel = evt.pixel || (evt.originalEvent ? mapRef.current.getEventPixel(evt.originalEvent) : null);
      if (!pixel) return;

      let featureFound = false;

      mapRef.current.forEachFeatureAtPixel(pixel, (featureAtPixel) => {
        featureFound = true;
        const typedFeature = featureAtPixel as Feature<Geometry>;
        const countryName = typedFeature.get("name") || "Pays inconnu";
        const isoCode = typedFeature.get("ISO3166-1-Alpha-2")?.toUpperCase();
        const currentCounts = countrySongCountsRef.current;
        const songCount = isoCode ? currentCounts[isoCode] || 0 : 0;

        // Calculate viewport-relative coordinates
        let xCoord = 0;
        let yCoord = 0;

        if (mapElement.current) {
          const rect = mapElement.current.getBoundingClientRect();
          xCoord = rect.left + pixel[0];
          yCoord = rect.top + pixel[1];
        } else {
          const originalEvent = evt.originalEvent;
          if (originalEvent) {
            xCoord = (originalEvent as any).clientX || 0;
            yCoord = (originalEvent as any).clientY || 0;
            if (xCoord === 0 && yCoord === 0 && (originalEvent as any).touches?.[0]) {
              xCoord = (originalEvent as any).touches[0].clientX;
              yCoord = (originalEvent as any).touches[0].clientY;
            }
          }
        }

        // Translate country name dynamically for tooltip
        let countryNameFr = countryName;
        if (isoCode) {
          try {
            const regionNames = new Intl.DisplayNames([language], { type: "region" });
            countryNameFr = regionNames.of(isoCode) || countryName;
          } catch {}
        }
 
        setTooltip({
          visible: true,
          content: `${countryNameFr} : ${songCount} ${language === "fr" ? `titre${songCount === 1 ? "" : "s"}` : `track${songCount === 1 ? "" : "s"}`}`,
          x: xCoord,
          y: yCoord,
        });

        if (mapElement.current) mapElement.current.style.cursor = "pointer";
        return true;
      });

      if (!featureFound) {
        setTooltip((prev) => ({ ...prev, visible: false }));
        if (mapElement.current) mapElement.current.style.cursor = "";
      }
    });

    // Click listener to toggle filter + position popup overlay
    initialMap.on("click", (evt: MapBrowserEvent<any>) => {
      if (!mapRef.current) return;
      const pixel = mapRef.current.getEventPixel(evt.originalEvent);
      let clickedFeature = false;

      mapRef.current.forEachFeatureAtPixel(pixel, (featureAtPixel) => {
        clickedFeature = true;
        const typedFeature = featureAtPixel as Feature<Geometry>;
        const isoCode = typedFeature.get("ISO3166-1-Alpha-2")?.toUpperCase();
        const countryName = typedFeature.get("name") || "Inconnu";

        let countryNameFr = countryName;
        if (isoCode) {
          try {
            const regionNames = new Intl.DisplayNames([language], { type: "region" });
            countryNameFr = regionNames.of(isoCode) || countryName;
          } catch {}
        }

        if (isoCode) {
          const currentlySelected = selectedCountryRef.current;
          if (currentlySelected === isoCode) {
            // Unselect on double click
            onCountryClickRef.current(null, countryNameFr);
            popupOverlay.setPosition(undefined);
          } else {
            // Select country and show popup at click coordinates
            onCountryClickRef.current(isoCode, countryNameFr);
            popupOverlay.setPosition(evt.coordinate);
          }
        }
        return true;
      });

      if (!clickedFeature) {
        // Clicked empty ocean: clear selection and close popup
        onCountryClickRef.current(null, "");
        popupOverlay.setPosition(undefined);
      }
    });

    const pointerLeaveListener = () => {
      setTooltip((prev) => ({ ...prev, visible: false }));
      if (mapElement.current) mapElement.current.style.cursor = "";
    };

    const mapTargetElement = initialMap.getTargetElement();
    if (mapTargetElement instanceof HTMLElement) {
      mapTargetElement.addEventListener("pointerleave", pointerLeaveListener);
    }

    // Fetch the simplified countries GeoJSON (592 KB)
    fetch("/countries.geojson")
      .then((response) => (response.ok ? response.json() : Promise.reject(`HTTP error! status: ${response.status}`)))
      .then((data) => {
        const geoJsonFormat = new GeoJSON();
        const features = geoJsonFormat.readFeatures(data, { featureProjection: "EPSG:3857" }) as Feature<Geometry>[];
        initialVectorSource.addFeatures(features);
      })
      .catch((error) => console.error("Error loading countries GeoJSON:", error));

    // Resize observer to auto-adjust map size
    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.updateSize();
      }
    });
    resizeObserver.observe(mapElement.current);

    return () => {
      resizeObserver.disconnect();
      if (mapRef.current) {
        const mapTargetElement = mapRef.current.getTargetElement();
        if (mapTargetElement instanceof HTMLElement) {
          mapTargetElement.removeEventListener("pointerleave", pointerLeaveListener);
        }
        mapRef.current.setTarget(undefined);
        mapRef.current.dispose();
        mapRef.current = null;
      }
    };
  }, []);

  // Update feature styles dynamically
  useEffect(() => {
    if (!vectorLayerRef.current) return;

    const countriesLayer = vectorLayerRef.current;
    const currentCounts = countrySongCounts;

    const countryStyleFunction = (feature: FeatureLike): Style => {
      const typedFeature = feature as Feature<Geometry>;
      const featureIsoCode = typedFeature.get("ISO3166-1-Alpha-2")?.toUpperCase();
      const songCount = featureIsoCode ? currentCounts[featureIsoCode] || 0 : 0;
      const isSelected = featureIsoCode ? selectedCountry === featureIsoCode : false;

      return new Style({
        fill: new Fill({
          color: getCountryColor(songCount, maxCount),
        }),
        stroke: new Stroke({
          color: isSelected ? "#fed7aa" : "#1c1917", // Orange outline for selection, dark for others
          width: isSelected ? 3.5 : 1.5, // Thick outline when selected
        }),
        zIndex: isSelected ? 10 : 1,
      });
    };

    countriesLayer.setStyle(countryStyleFunction);
    countriesLayer.changed();
  }, [countrySongCounts, selectedCountry, maxCount]);

  const handleClosePopup = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCountryClick(null, "");
    overlayRef.current?.setPosition(undefined);
  };

  return (
    <div 
      style={{ 
        position: "relative",
        height: isMobile ? "320px" : "450px", 
        width: "100%",
        border: "var(--border-thick)", 
        borderRadius: "16px", 
        overflow: "hidden", 
        boxShadow: "var(--shadow-hard)" 
      }}
    >
      {/* Map DOM Target */}
      <div ref={mapElement} style={{ height: "100%", width: "100%", backgroundColor: "#fbf8f3" }} />

      {/* Monochrome Soft Green Legend Panel - Positioned top-right to avoid blocking South American countries */}
      <div 
        style={{
          position: "absolute",
          top: "16px",
          right: "16px",
          backgroundColor: "#ffffff",
          border: "3px solid #1c1917",
          boxShadow: "3px 3px 0px 0px #1c1917",
          borderRadius: "8px",
          padding: "0.5rem 0.75rem",
          fontFamily: "monospace",
          fontSize: "0.75rem",
          zIndex: 5,
          pointerEvents: "none",
          display: "flex",
          flexDirection: "column",
          gap: "4px"
        }}
      >
        <div style={{ fontWeight: "bold", marginBottom: "4px", borderBottom: "1.5px solid #1c1917", paddingBottom: "2px" }}>
          {t("map.legend")}
        </div>
        {legendRanges.map((range, idx) => (
          <div key={idx} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: "12px", height: "12px", border: "1px solid #1c1917", backgroundColor: range.color }}></div>
            <span>{range.text}</span>
          </div>
        ))}
      </div>

      {/* Floating Tooltip - Rendered via Portal to document.body to prevent layout clipping and legend overlaps */}
      {mounted && tooltip.visible && !isTouchDevice && createPortal(
        <div
          style={{
            position: "fixed",
            pointerEvents: "none",
            zIndex: 9999,
            whiteSpace: "nowrap",
            top: `${tooltip.y - 15}px`,
            left: `${tooltip.x + 15}px`,
            transform: "translateY(-100%)",
            backgroundColor: "#ffffff",
            border: "var(--border-thin)",
            boxShadow: "3px 3px 0px 0px var(--foreground)",
            padding: "0.4rem 0.8rem",
            fontSize: "0.85rem",
            fontWeight: 700,
            borderRadius: "8px",
            color: "var(--foreground)",
            fontFamily: "monospace"
          }}
        >
          {tooltip.content}
        </div>,
        document.body
      )}

      {/* Wrapper protecting React from OpenLayers DOM overlay manipulation */}
      <div>
        {/* Map Overlay Popup (Track List for selected country) */}
        <div 
          ref={popupElement} 
          style={{
            backgroundColor: "#ffffff",
            border: "3px solid #1c1917",
            boxShadow: "4px 4px 0px 0px #1c1917",
            borderRadius: "12px",
            padding: "0.75rem",
            minWidth: "260px",
            maxWidth: "320px",
            maxHeight: "240px",
            display: "flex",
            flexDirection: "column",
            fontFamily: "monospace",
            color: "#1c1917",
            // Positioned above OpenLayers elements
            zIndex: 100
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem", borderBottom: "2px solid #1c1917", paddingBottom: "4px" }}>
            <span style={{ fontWeight: "bold", fontSize: "0.9rem", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
              📍 {selectedCountryName || (language === "fr" ? "Pays" : "Country")}
            </span>
            <button 
              onClick={handleClosePopup}
              style={{
                border: "2px solid #1c1917",
                backgroundColor: "var(--color-pink)",
                borderRadius: "4px",
                width: "20px",
                height: "20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "0.75rem",
                boxShadow: "1px 1px 0px 0px #1c1917"
              }}
            >
              x
            </button>
          </div>

          <div style={{ fontSize: "0.75rem", fontWeight: "bold", marginBottom: "6px" }}>
            🎵 {selectedCountryTracks.length} {language === "fr" ? `titre${selectedCountryTracks.length > 1 ? "s" : ""}` : `track${selectedCountryTracks.length > 1 ? "s" : ""}`}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto", flex: 1 }}>
            {selectedCountryTracks.length === 0 ? (
              <div style={{ fontSize: "0.7rem", color: "#666", padding: "0.5rem", textAlign: "center" }}>
                {t("map.noTracks")}
              </div>
            ) : (
              selectedCountryTracks.map((track) => {
                const isSelectedTrack = selectedTrack && selectedTrack.id === track.id;
                return (
                  <div 
                    key={track.id} 
                    onClick={() => onTrackSelect?.(track)}
                    style={{ 
                      padding: "0.3rem 0.5rem", 
                      border: isSelectedTrack ? "2px solid #1c1917" : "1px solid #1c1917", 
                      borderRadius: "6px", 
                      backgroundColor: isSelectedTrack ? "var(--color-yellow)" : "#fbf8f3",
                      fontSize: "0.7rem",
                      lineHeight: "1.2",
                      cursor: "pointer",
                      fontWeight: isSelectedTrack ? "bold" : "normal",
                      boxShadow: isSelectedTrack ? "1px 1px 0px 0px #1c1917" : "none"
                    }}
                  >
                    <div style={{ fontWeight: "bold", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {track.name}
                    </div>
                    <div style={{ color: isSelectedTrack ? "#1c1917" : "#666", opacity: isSelectedTrack ? 0.9 : 1, textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                      {track.artists}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapOrigines;
