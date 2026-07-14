"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";

const SILHOUETTES = [
  {
    id: "executive",
    name: "The Notch Executive",
    tagline: "The Cornerstone of Business Formal",
    lapel: "Notch Lapel (3.25 inches)",
    canvas: "Half-Canvas Structure",
    buttons: "2-Button Single Breasted",
    description: "Designed for daily impact and boardroom dominance. The notch lapel is versatile, modern, and classic. Constructed with a light shoulder pad and high armhole for ease of movement.",
    stylingTip: "Pair with a crisp white poplin shirt, a semi-windsor knot silk tie, and black calfskin oxfords.",
    tag: "OL-SIL-01",
  },
  {
    id: "double-breasted",
    name: "The Peak Double-Breasted",
    tagline: "Unapologetic Power & Presence",
    lapel: "Peak Lapel (4.0 inches)",
    canvas: "Full-Canvas Construction",
    buttons: "6x2 Button Alignment",
    description: "A commanding presence. The peak lapels sweep upward toward the shoulder, broadening the torso. Features functional sleeve buttonholes (surgical cuffs) and side vents.",
    stylingTip: "Perfect for weddings and high-profile galas. Best worn with a gold collar bar shirt and a pocket square.",
    tag: "OL-SIL-02",
  },
  {
    id: "tuxedo",
    name: "The Shawl Tuxedo",
    tagline: "Classic Black Tie Majesty",
    lapel: "Shawl Collar (Satin Silk)",
    canvas: "Floating Full-Canvas",
    buttons: "1-Button Closure",
    description: "The peak of evening formalwear. The shawl collar flows in an unbroken curve of pure black satin silk, creating a sleek, elongated silhouette. Fully lined in Bemberg cupro.",
    stylingTip: "Strictly formal. Pair with a pleated tuxedo shirt, silk bow tie, and patent leather dress shoes.",
    tag: "OL-SIL-03",
  },
];

const FABRICS = [
  {
    id: "charcoal-pinstripe",
    name: "Royal Charcoal Pinstripe",
    origin: "Biella, Italy",
    weight: "260g/m (All-Season)",
    composition: "100% Super 130s Merino Wool",
    desc: "A rich charcoal base woven with fine silver thread stripes spaced exactly 12mm apart. Offers a soft, dry hand feel and immaculate crease resistance.",
    color: "#242528",
    glowColor: "rgba(100,110,120,0.15)",
    cssPattern: `repeating-linear-gradient(90deg, #1b1c1e, #1b1c1e 1px, #26272b 1px, #26272b 32px)`,
  },
  {
    id: "midnight-barathea",
    name: "Midnight Barathea Silk-Wool",
    origin: "Yorkshire, England",
    weight: "290g/m (Formal Evening)",
    composition: "80% Worsted Wool, 20% Silk",
    desc: "A traditional tuxedo fabric with a subtle pebbled weave that absorbs light, making the fabric appear a deeper, richer midnight blue than pure black.",
    color: "#0a0c16",
    glowColor: "rgba(30,40,90,0.18)",
    cssPattern: `radial-gradient(circle at 50% 50%, #0d1020 0%, #06070e 100%)`,
  },
  {
    id: "golden-herringbone",
    name: "Warm Gold Herringbone",
    origin: "Inverness, Scotland",
    weight: "340g/m (Autumn Blazer)",
    composition: "90% Shetland Wool, 10% Cashmere",
    desc: "An heritage weave in warm gold and sand tones. The cashmere content adds a luxurious loftiness and soft touch, perfect for unstructured sport coats.",
    color: "#c29d53",
    glowColor: "rgba(217,176,84,0.15)",
    cssPattern: `repeating-linear-gradient(45deg, #a4813f, #a4813f 4px, #bda260 4px, #bda260 8px)`,
  },
  {
    id: "emerald-velvet",
    name: "Deep Emerald Velvet Pile",
    origin: "Lyon, France",
    weight: "380g/m (Smoking Jacket)",
    composition: "100% Cotton Silk Velvet",
    desc: "An opulent, plush velvet with a directional pile that creates deep shadows and rich emerald highlights under evening lighting.",
    color: "#0b2c1f",
    glowColor: "rgba(11,44,31,0.22)",
    cssPattern: `linear-gradient(135deg, #071c14 0%, #0b3d29 50%, #04100b 100%)`,
  },
];

export function SilhouetteBuilder() {
  const [activeSil, setActiveSil] = useState(SILHOUETTES[0]);
  const [activeFab, setActiveFab] = useState(FABRICS[0]);

  return (
    <section className="bg-white border-b border-border-light py-28 relative overflow-hidden">
      
      {/* Dynamic ambient fabric glow */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[140px] pointer-events-none transition-all duration-1000 z-0"
        style={{ backgroundColor: activeFab.glowColor }}
      />

      <div className="mx-auto max-w-[1536px] px-6 sm:px-12 lg:px-20 relative z-10">
        
        <div className="text-center mb-20">
          <div className="text-[12px] font-semibold tracking-[6px] text-gold-deep uppercase">Interactive Atelier</div>
          <h2 className="mt-3 font-serif text-4xl sm:text-5xl text-ink tracking-tight">
            Design Your Silhouette
          </h2>
          <p className="mt-4 text-sm text-text-muted max-w-xl mx-auto">
            Choose your cut and explore luxury materials sourced from heritage mills. Toggle combinations below to preview the architectural details of your next garment.
          </p>
        </div>

        {/* Part 1: Silhouette cut customizer */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start mb-24">
          
          {/* Left panel: details */}
          <div className="lg:col-span-5 flex flex-col justify-between h-full min-h-[420px]">
            <div>
              <div className="flex gap-3">
                {SILHOUETTES.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setActiveSil(s)}
                    className={`px-4 py-2 text-xs font-bold tracking-wider uppercase border rounded-md transition-all duration-300 ${
                      activeSil.id === s.id
                        ? "bg-black text-gold border-black shadow-md"
                        : "bg-white text-text-muted border-border-light hover:border-gold/50"
                    }`}
                  >
                    {s.name.split(" ")[1] /* Notch, Peak, Shawl */}
                  </button>
                ))}
              </div>

              <div className="mt-10">
                <span className="font-mono text-[9px] tracking-[4px] text-gold-deep block uppercase">{activeSil.tag}</span>
                <h3 className="font-serif text-3xl sm:text-4xl text-ink mt-2 transition-all duration-500">{activeSil.name}</h3>
                <p className="text-xs italic text-text-faint mt-1 tracking-wide">{activeSil.tagline}</p>
                <p className="mt-6 text-sm leading-relaxed text-text-body font-light max-w-md">
                  {activeSil.description}
                </p>
              </div>
            </div>

            <div className="mt-8 pt-8 border-t border-border-light/60">
              <div className="grid grid-cols-3 gap-4 text-xs font-mono">
                <div>
                  <span className="block text-[8px] text-text-faint uppercase">LAPEL</span>
                  <span className="text-ink font-bold mt-1 block">{activeSil.lapel}</span>
                </div>
                <div>
                  <span className="block text-[8px] text-text-faint uppercase">CANVAS</span>
                  <span className="text-ink font-bold mt-1 block">{activeSil.canvas}</span>
                </div>
                <div>
                  <span className="block text-[8px] text-text-faint uppercase">BUTTONS</span>
                  <span className="text-ink font-bold mt-1 block">{activeSil.buttons}</span>
                </div>
              </div>
              <div className="bg-cream-soft rounded border border-border-light p-4 mt-6">
                <span className="text-[9px] font-bold tracking-[2px] text-gold-deep block uppercase">STYLING NOTE</span>
                <p className="text-[11px] text-text-body mt-1">{activeSil.stylingTip}</p>
              </div>
            </div>

          </div>

          {/* Right panel: visual showcase card */}
          <div className="lg:col-span-7 h-[460px] w-full rounded-xl border border-border-light bg-white p-8 shadow-[0_20px_50px_rgba(0,0,0,0.02)] flex flex-col justify-between relative overflow-hidden group">
            
            {/* Fine architectural lines over card */}
            <div className="absolute inset-x-8 top-1/2 h-px bg-gold/10 pointer-events-none" />
            <div className="absolute inset-y-8 left-1/3 w-px bg-gold/10 pointer-events-none" />
            
            <div className="flex justify-between items-start z-10">
              <div>
                <span className="text-[9px] font-mono tracking-widest text-text-faint">FITTING MODEL GUIDE</span>
                <h4 className="font-serif text-lg text-ink mt-0.5">Jacket Specifications</h4>
              </div>
              <div className="w-10 h-10 border border-gold/30 rounded-full flex items-center justify-center font-mono text-xs text-gold">
                OL
              </div>
            </div>

            {/* Silhouette details illustration cards */}
            <div className="my-auto grid grid-cols-1 md:grid-cols-2 gap-8 items-center z-10">
              
              <div className="space-y-4">
                <div className="flex items-center gap-3 bg-cream-soft border border-border-light p-3.5 rounded-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-gold animate-pulse" />
                  <div>
                    <span className="text-[9px] text-text-faint uppercase block font-mono">Lapel Placement</span>
                    <span className="text-xs text-ink font-bold">{activeSil.lapel}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-cream-soft border border-border-light p-3.5 rounded-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-ink" />
                  <div>
                    <span className="text-[9px] text-text-faint uppercase block font-mono">Canvas Alignment</span>
                    <span className="text-xs text-ink font-bold">{activeSil.canvas}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-cream-soft border border-border-light p-3.5 rounded-lg">
                  <div className="w-2.5 h-2.5 rounded-full bg-gold-deep" />
                  <div>
                    <span className="text-[9px] text-text-faint uppercase block font-mono">Button Configuration</span>
                    <span className="text-xs text-ink font-bold">{activeSil.buttons}</span>
                  </div>
                </div>
              </div>

              <div className="relative h-64 w-full border border-dashed border-gold/30 rounded-lg flex items-center justify-center bg-[#faf9f6]/40 backdrop-blur-sm overflow-hidden">
                <span className="absolute top-2 left-2 text-[8px] font-mono text-text-faint">LAPEL OVERLAY VIEW</span>
                
                {/* Minimalist vector blazer silhouette drawing using purely styled divs */}
                <div className="relative w-44 h-48 flex items-center justify-center opacity-85">
                  {/* Shoulders */}
                  <div className="absolute top-8 w-40 h-px bg-ink/30" />
                  <div className="absolute top-8 left-0 w-8 h-8 border-t border-l border-ink/40 rounded-tl-lg" />
                  <div className="absolute top-8 right-0 w-8 h-8 border-t border-r border-ink/40 rounded-tr-lg" />
                  
                  {/* Chest lines */}
                  <div className="absolute top-16 w-32 h-20 border-b border-ink/20" />

                  {/* Dynamic lapel shapes based on selection */}
                  <AnimatePresence mode="wait">
                    {activeSil.id === "executive" && (
                      <motion.div
                        key="exec"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        {/* Left lapel */}
                        <div className="absolute top-8 left-10 w-8 h-20 border-r-2 border-b-2 border-gold-deep rounded-br-[4px] transform rotate-[15deg]" />
                        {/* Right lapel */}
                        <div className="absolute top-8 right-10 w-8 h-20 border-l-2 border-b-2 border-gold-deep rounded-bl-[4px] transform -rotate-[15deg]" />
                        {/* Notch cut mock */}
                        <div className="absolute top-16 left-12 w-2 h-2 bg-[#faf9f6] border-r border-t border-gold-deep/30 transform rotate-45" />
                        <div className="absolute top-16 right-12 w-2 h-2 bg-[#faf9f6] border-l border-t border-gold-deep/30 transform -rotate-45" />
                      </motion.div>
                    )}

                    {activeSil.id === "double-breasted" && (
                      <motion.div
                        key="double"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        {/* Sweeping wide peak lapels */}
                        <div className="absolute top-6 left-8 w-11 h-22 border-r-2 border-b-2 border-gold-deep rounded-br-[6px] transform rotate-[8deg]" />
                        <div className="absolute top-6 right-8 w-11 h-22 border-l-2 border-b-2 border-gold-deep rounded-bl-[6px] transform -rotate-[8deg]" />
                        {/* Peak details */}
                        <div className="absolute top-10 left-6 w-3 h-px bg-gold-deep" />
                        <div className="absolute top-10 right-6 w-3 h-px bg-gold-deep" />
                        {/* Double button grid */}
                        <div className="absolute bottom-12 left-14 w-2 h-2 rounded-full bg-gold" />
                        <div className="absolute bottom-12 right-14 w-2 h-2 rounded-full bg-gold" />
                        <div className="absolute bottom-18 left-14 w-2 h-2 rounded-full bg-gold" />
                        <div className="absolute bottom-18 right-14 w-2 h-2 rounded-full bg-gold" />
                      </motion.div>
                    )}

                    {activeSil.id === "tuxedo" && (
                      <motion.div
                        key="tux"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.4 }}
                        className="absolute inset-0 flex items-center justify-center"
                      >
                        {/* Continuous curve shawl collar */}
                        <div className="absolute top-8 left-9 w-10 h-24 border-r-4 border-b-2 border-gold rounded-br-[36px] transform rotate-[12deg] opacity-90" />
                        <div className="absolute top-8 right-9 w-10 h-24 border-l-4 border-b-2 border-gold rounded-bl-[36px] transform -rotate-[12deg] opacity-90" />
                        {/* Tuxedo single button closure */}
                        <div className="absolute bottom-10 w-2.5 h-2.5 rounded-full bg-gold" />
                      </motion.div>
                    )}
                  </AnimatePresence>

                </div>
              </div>

            </div>

            <div className="flex justify-between items-center text-[10px] text-text-faint font-mono border-t border-border-light/60 pt-4 z-10">
              <span>PATTERN REF: OUTFITLOUNGE-2026</span>
              <span>Complimentary Alterations Included</span>
            </div>

          </div>

        </div>

        {/* Part 2: Fabric Swatch board */}
        <div className="border border-border-light rounded-xl bg-[#fcfbfa] p-10 shadow-[0_15px_40px_rgba(0,0,0,0.01)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
            <div>
              <span className="text-[9px] font-mono tracking-widest text-gold-deep block uppercase">SWATCH BOARD</span>
              <h3 className="font-serif text-2xl text-ink mt-1">Select Textile Origin</h3>
            </div>
            <div className="flex gap-4">
              {FABRICS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setActiveFab(f)}
                  aria-label={`Select ${f.name}`}
                  className={`w-12 h-12 rounded-full border-2 transition-all duration-300 flex items-center justify-center overflow-hidden hover:scale-105 ${
                    activeFab.id === f.id ? "border-gold shadow-md" : "border-border-light hover:border-gold/40"
                  }`}
                  style={{ background: f.cssPattern }}
                />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            <div className="md:col-span-4 h-56 rounded-lg border border-border-light overflow-hidden relative shadow-inner" style={{ background: activeFab.cssPattern }}>
              {/* Overlay sheen */}
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-white/10 to-transparent" />
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded border border-border-light text-[9px] font-mono tracking-widest text-ink font-bold">
                100% REAL TEXTURE
              </div>
            </div>

            <div className="md:col-span-8 flex flex-col justify-between h-56 py-2">
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-serif text-2xl text-ink">{activeFab.name}</h4>
                    <span className="text-xs text-gold-deep font-mono tracking-wider block mt-1">Origin: {activeFab.origin}</span>
                  </div>
                  <div className="text-right font-mono text-[10px] text-text-faint">
                    <span>WEIGHT: {activeFab.weight}</span>
                  </div>
                </div>
                <p className="mt-4 text-sm text-text-body font-light leading-relaxed max-w-2xl">
                  {activeFab.desc}
                </p>
              </div>

              <div className="pt-4 border-t border-border-light/60 flex items-center justify-between text-[11px] font-mono text-text-muted">
                <div>
                  <span className="text-[9px] text-text-faint block uppercase">COMPOSITION</span>
                  <span className="text-ink font-bold mt-0.5 block">{activeFab.composition}</span>
                </div>
                <Link
                  href="/shop"
                  className="bg-black text-gold font-bold px-5 py-2.5 rounded border border-gold/10 hover:bg-gold hover:text-ink transition-colors duration-300"
                >
                  Request Swatch Sample
                </Link>
              </div>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}
