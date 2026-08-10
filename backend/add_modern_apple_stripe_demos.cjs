const fs = require('fs');
const path = require('path');

function addAppleStripeDemos() {
  const homeCssPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Home.css');

  const modernCss = `

/* ==================================================
   🔥 2026 ULTRA-LUXE APPLE & STRIPE ANIMATIONS (DEMO 7, 8, 9)
   ================================================== */

/* ── Demo 7: Apple Ultra-Smooth Spring Physics & Shimmer Trace ── */
.anim-demo7 .site-header {
  animation: appleFluidEntrance 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.anim-demo7 .hero-section {
  animation: appleFluidEntrance 1.2s cubic-bezier(0.22, 1, 0.36, 1) 0.1s forwards;
}
.anim-demo7 .cat-card {
  animation: appleCardReveal 1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
}
.anim-demo7 .cat-card:nth-child(1) { animation-delay: 0.12s; }
.anim-demo7 .cat-card:nth-child(2) { animation-delay: 0.18s; }
.anim-demo7 .cat-card:nth-child(3) { animation-delay: 0.24s; }
.anim-demo7 .cat-card:nth-child(4) { animation-delay: 0.30s; }
.anim-demo7 .cat-card:nth-child(5) { animation-delay: 0.36s; }
.anim-demo7 .cat-card:nth-child(6) { animation-delay: 0.42s; }
.anim-demo7 .cat-card:nth-child(7) { animation-delay: 0.48s; }
.anim-demo7 .cat-card:nth-child(8) { animation-delay: 0.54s; }
.anim-demo7 .cat-card:nth-child(9) { animation-delay: 0.60s; }

.anim-demo7 .product-card {
  animation: appleCardReveal 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards;
  position: relative;
}
.anim-demo7 .product-card::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: 16px;
  padding: 1.5px;
  background: linear-gradient(135deg, #10b981, transparent 40%, #0284c7);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
  opacity: 0.6;
}

@keyframes appleFluidEntrance {
  0% { opacity: 0; transform: perspective(1200px) translateY(50px) scale(0.95); }
  100% { opacity: 1; transform: perspective(1200px) translateY(0) scale(1); }
}

@keyframes appleCardReveal {
  0% { opacity: 0; transform: perspective(1000px) translateY(40px) rotateX(12deg) scale(0.94); }
  100% { opacity: 1; transform: perspective(1000px) translateY(0) rotateX(0deg) scale(1); }
}

/* ── Demo 8: Stripe & Vercel Kinetic Mesh Glow Ray ── */
.anim-demo8 .hero-section {
  position: relative;
  overflow: hidden;
}
.anim-demo8 .hero-section::after {
  content: '';
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 30%, rgba(16, 185, 129, 0.25), transparent 70%);
  animation: stripeGlowPulse 4s infinite alternate;
  pointer-events: none;
}
.anim-demo8 .cat-card,
.anim-demo8 .product-card {
  animation: stripeKineticAssembly 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.4s ease;
}
.anim-demo8 .cat-card:hover,
.anim-demo8 .product-card:hover {
  transform: translateY(-8px) scale(1.03);
  box-shadow: 0 20px 40px rgba(16, 185, 129, 0.25), 0 0 30px rgba(2, 132, 199, 0.2);
}

@keyframes stripeGlowPulse {
  0% { opacity: 0.4; transform: scale(0.95); }
  100% { opacity: 0.8; transform: scale(1.1); }
}

@keyframes stripeKineticAssembly {
  0% { opacity: 0; transform: translateY(60px) scale(0.9); filter: saturate(0.2); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: saturate(1); }
}

/* ── Demo 9: Cyber Luxe 3D Depth Card Unfold ── */
.anim-demo9 .cat-card {
  animation: cyber3dUnfold 1s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.anim-demo9 .cat-card:nth-child(odd) { animation-name: cyber3dUnfoldLeft; }
.anim-demo9 .cat-card:nth-child(even) { animation-name: cyber3dUnfoldRight; }

@keyframes cyber3dUnfoldLeft {
  0% { opacity: 0; transform: perspective(1000px) rotateY(-25deg) translateY(30px); }
  100% { opacity: 1; transform: perspective(1000px) rotateY(0deg) translateY(0); }
}
@keyframes cyber3dUnfoldRight {
  0% { opacity: 0; transform: perspective(1000px) rotateY(25deg) translateY(30px); }
  100% { opacity: 1; transform: perspective(1000px) rotateY(0deg) translateY(0); }
}
`;

  fs.appendFileSync(homeCssPath, modernCss, 'utf8');
  console.log("✅ Added 2026 Apple & Stripe Animations Demo 7, 8, 9 to Home.css");
}

addAppleStripeDemos();
