"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";

const ITEMS = [
  {
    label: "BESPOKE JACKET",
    desc: "Super 150s Merino blazer coat",
    ref: "REF: OL-JKT-102",
    image: "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?fm=jpg&q=75&w=300&auto=format&fit=crop",
  },
  {
    label: "POPLIN SHIRT",
    desc: "Crisp Egyptian double-cuff shirt",
    ref: "REF: OL-SHT-204",
    image: "https://images.unsplash.com/photo-1603252109303-2751441dd157?fm=jpg&q=75&w=300&auto=format&fit=crop",
  },
  {
    label: "SILK JACQUARD TIE",
    desc: "Hand-rolled woven necktie",
    ref: "REF: OL-TIE-045",
    image: "https://images.unsplash.com/photo-1589756823855-edd13437435e?fm=jpg&q=75&w=300&auto=format&fit=crop",
  },
  {
    label: "CALFSKIN SHOES",
    desc: "Hand-burnished leather oxfords",
    ref: "REF: OL-SHOE-782",
    image: "https://images.unsplash.com/photo-1533867617858-e7b97e060509?fm=jpg&q=75&w=300&auto=format&fit=crop",
  },
  {
    label: "GOLD CHRONOGRAPH",
    desc: "Luxury classic dress timepiece",
    ref: "REF: OL-WATCH-012",
    image: "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?fm=jpg&q=75&w=300&auto=format&fit=crop",
  },
];

// Oval radius configuration for a wider, more majestic orbital layout
const RADIUS_X = 350;
const RADIUS_Y = 130;

function orbitTransform(progress: number, index: number, total: number) {
  // Rotate through scroll progress
  const baseAngle = progress * 360;
  const angle = ((baseAngle + (index * 360) / total) * Math.PI) / 180;
  
  const depth = Math.sin(angle); // -1 (back) to +1 (front)
  const x = Math.cos(angle) * RADIUS_X;
  const y = depth * RADIUS_Y;
  
  // Scale dynamically based on depth to create a realistic 3D feel
  const scale = 0.82 + depth * 0.18;
  const zIndex = Math.round(50 + depth * 50); // 0 (back) to 100 (front)
  
  return {
    transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) scale(${scale.toFixed(4)})`,
    zIndex,
    opacity: 0.35 + (depth + 1) * 0.325, // Dim items in the background
  };
}

export function OrbitShowcase() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);
  const [hoveredItem, setHoveredItem] = useState<typeof ITEMS[0] | null>(null);

  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const el = sectionRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const totalHeight = rect.height - window.innerHeight;
        const passed = -rect.top;
        setProgress(Math.max(0, Math.min(1, totalHeight > 0 ? passed / totalHeight : 0)));
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div ref={sectionRef} className="relative h-[250vh] bg-white border-b border-border-light">
      
      {/* Sticky Orbit Canvas */}
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden z-10 bg-[#fcfbfa]/60 backdrop-blur-[2px]">
        
        {/* Golden Radial Aura Effect */}
        <div
          className="absolute w-[900px] h-[550px] rounded-full blur-[110px] pointer-events-none transition-all duration-700 opacity-80"
          style={{
            background: "radial-gradient(ellipse at center, rgba(217,176,84,0.15) 0%, rgba(217,176,84,0.05) 50%, transparent 70%)",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
          }}
        />

        {/* Orbit Background Tilted Ring Elements (Aesthetic Golden Ring) */}
        <div 
          className="absolute border border-gold/25 rounded-full pointer-events-none transition-transform duration-300"
          style={{
            width: `${RADIUS_X * 2}px`,
            height: `${RADIUS_Y * 2.2}px`,
            transform: "rotateX(72deg) rotateY(4deg)",
          }}
        />
        <div 
          className="absolute border border-dashed border-gold/15 rounded-full pointer-events-none"
          style={{
            width: `${RADIUS_X * 2 + 50}px`,
            height: `${RADIUS_Y * 2.2 + 25}px`,
            transform: "rotateX(72deg) rotateY(4deg) scale(1.08)",
          }}
        />

        {/* Header content overlay */}
        <div className="absolute top-16 z-20 text-center px-4">
          <div className="text-[12px] font-semibold tracking-[6px] text-gold-deep uppercase">THE COMPLETE LOOK</div>
          <h2 className="mt-3 font-serif text-3xl sm:text-4xl lg:text-5xl text-ink tracking-tight">Styled Around You</h2>
          <p className="mt-2 text-xs text-text-muted max-w-md mx-auto">
            Hover over the floating luxury pieces to see the details of our complete formal ensembles.
          </p>
        </div>

        {/* Floating details panel */}
        <div className="absolute bottom-12 z-20 h-16 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {hoveredItem ? (
              <motion.div
                key={hoveredItem.label}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="bg-ink border border-gold/30 rounded-lg px-8 py-3 shadow-[0_15px_40px_rgba(0,0,0,0.15)] text-center text-cream flex items-center gap-6 backdrop-blur-md"
              >
                <div className="text-left">
                  <span className="font-mono text-[8px] text-gold tracking-widest block">{hoveredItem.ref}</span>
                  <span className="text-xs font-bold block uppercase tracking-wider mt-0.5 text-white">{hoveredItem.label}</span>
                </div>
                <div className="w-[2px] h-6 bg-gold/30" />
                <p className="text-[11px] text-cream-dim tracking-wide text-left max-w-[280px]">
                  {hoveredItem.desc}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="idle"
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.6 }}
                className="text-[11px] font-mono tracking-widest text-text-faint uppercase text-center"
              >
                [ Scroll to Rotate Elements ]
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Central Model & Orbit Group */}
        <div className="relative h-[480px] w-[260px] flex items-center justify-center">
          
          {/* Main Central Model Capsule (High Fashion Real World Man in Suit) */}
          <div
            className="relative h-[440px] w-[240px] overflow-hidden rounded-t-[120px] rounded-b-[32px] border-2 shadow-[0_25px_60px_rgba(184,134,58,0.1)] bg-cream-soft transition-all duration-500 hover:scale-[1.01]"
            style={{
              borderColor: "rgba(217,176,84,0.65)",
            }}
          >
            <Image
              src="https://images.unsplash.com/photo-1617137968427-85924c800a22?fm=jpg&q=85&w=500&auto=format&fit=crop"
              alt="High-fashion digital model in a tailored navy blue suit"
              fill
              sizes="240px"
              className="object-cover"
              priority
            />
            {/* Visual Gold Overlay Gradients */}
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(217,176,84,0.06) 0%, transparent 40%, rgba(11,11,12,0.45) 100%)",
              }}
            />
          </div>

          {/* Halo lighting outline behind the model */}
          <div className="absolute -inset-2 rounded-t-[128px] rounded-b-[40px] border border-gold/30 animate-pulse pointer-events-none z-0" />

          {/* Tilted orbit rings (to guide the eye) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            
            {/* Accessory Orbit Items */}
            {ITEMS.map((item, i) => {
              const transformProps = orbitTransform(progress, i, ITEMS.length);
              return (
                <div
                  key={item.label}
                  onMouseEnter={() => setHoveredItem(item)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className="absolute pointer-events-auto cursor-pointer transition-all duration-300 hover:scale-110"
                  style={{
                    transform: transformProps.transform,
                    zIndex: transformProps.zIndex,
                    opacity: transformProps.opacity,
                  }}
                >
                  <div
                    className="relative w-24 h-24 rounded-full border border-gold/75 bg-white shadow-[0_12px_28px_rgba(0,0,0,0.1)] overflow-hidden"
                  >
                    <Image
                      src={item.image}
                      alt={item.label}
                      fill
                      sizes="96px"
                      className="object-cover transition-transform duration-500 hover:scale-105"
                    />
                    
                    {/* Shadow overlay */}
                    <div className="absolute inset-0 bg-black/10 hover:bg-transparent transition-colors duration-300" />
                  </div>
                  
                  {/* Decorative orbital tag dot */}
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gold border border-white shadow-sm flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-black" />
                  </div>
                </div>
              );
            })}
            
          </div>

        </div>

      </div>

    </div>
  );
}
