const fs = require('fs');
const path = require('path');

function addPageWideDemos() {
  const homeCssPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Home.css');

  const extraCss = `

/* ==================================================
   🚀 FULL-PAGE STAGGERED ENTRANCE ANIMATIONS (DEMO 4, 5, 6)
   ================================================== */

/* ── Demo 4: Cascade Ripple Reveal (Domino Wave) ── */
.anim-demo4 .site-header {
  animation: cascadeFade 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.anim-demo4 .hero-section {
  animation: cascadeFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
}
.anim-demo4 .cat-card:nth-child(1) { animation: cascadeFade 0.6s ease 0.25s forwards; }
.anim-demo4 .cat-card:nth-child(2) { animation: cascadeFade 0.6s ease 0.32s forwards; }
.anim-demo4 .cat-card:nth-child(3) { animation: cascadeFade 0.6s ease 0.39s forwards; }
.anim-demo4 .cat-card:nth-child(4) { animation: cascadeFade 0.6s ease 0.46s forwards; }
.anim-demo4 .cat-card:nth-child(5) { animation: cascadeFade 0.6s ease 0.53s forwards; }
.anim-demo4 .cat-card:nth-child(6) { animation: cascadeFade 0.6s ease 0.60s forwards; }
.anim-demo4 .cat-card:nth-child(7) { animation: cascadeFade 0.6s ease 0.67s forwards; }
.anim-demo4 .cat-card:nth-child(8) { animation: cascadeFade 0.6s ease 0.74s forwards; }
.anim-demo4 .cat-card:nth-child(9) { animation: cascadeFade 0.6s ease 0.81s forwards; }

.anim-demo4 .product-card {
  animation: cascadeFade 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.5s forwards;
}

@keyframes cascadeFade {
  0% { opacity: 0; transform: translateY(45px) scale(0.94); filter: blur(4px); }
  100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}

/* ── Demo 5: Luxe Magnet Grid Fly-In (Alternating Angles) ── */
.anim-demo5 .cat-card:nth-child(odd) {
  animation: magnetFlyLeft 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.anim-demo5 .cat-card:nth-child(even) {
  animation: magnetFlyRight 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
.anim-demo5 .product-card {
  animation: magnetFlyUp 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}

@keyframes magnetFlyLeft {
  0% { opacity: 0; transform: translateX(-60px) rotate(-4deg) scale(0.9); }
  100% { opacity: 1; transform: translateX(0) rotate(0deg) scale(1); }
}

@keyframes magnetFlyRight {
  0% { opacity: 0; transform: translateX(60px) rotate(4deg) scale(0.9); }
  100% { opacity: 1; transform: translateX(0) rotate(0deg) scale(1); }
}

@keyframes magnetFlyUp {
  0% { opacity: 0; transform: translateY(60px) scale(0.92); box-shadow: 0 0 0 rgba(0,0,0,0); }
  100% { opacity: 1; transform: translateY(0) scale(1); box-shadow: 0 10px 30px rgba(16, 185, 129, 0.15); }
}

/* ── Demo 6: Hologram Laser Beam Sweep & Materialize ── */
.anim-demo6 .hero-section::before,
.anim-demo6 .categories-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(52, 211, 153, 0.35), transparent);
  animation: laserSweep 1.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  z-index: 10;
  pointer-events: none;
}

.anim-demo6 .cat-card,
.anim-demo6 .product-card,
.anim-demo6 .why-card {
  animation: hologramMaterialize 0.8s ease forwards;
}

@keyframes laserSweep {
  0% { left: -100%; }
  100% { left: 200%; }
}

@keyframes hologramMaterialize {
  0% { opacity: 0; transform: scale(0.88); filter: brightness(1.8) contrast(1.2); }
  70% { opacity: 0.9; transform: scale(1.03); filter: brightness(1.2); }
  100% { opacity: 1; transform: scale(1); filter: brightness(1) contrast(1); }
}
`;

  fs.appendFileSync(homeCssPath, extraCss, 'utf8');
  console.log("✅ Added Full-Page Staggered Entrance Demos 4, 5, 6 to Home.css");
}

addPageWideDemos();
