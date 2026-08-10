const fs = require('fs');
const path = require('path');

function addLandingAnimationDemos() {
  const homeJsxPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Home.jsx');
  const homeCssPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'Home.css');

  // 1. Update Home.css with smooth keyframes and styles for all 3 animation modes
  const newCssContent = `

/* ==================================================
   🌟 HIGH-END LANDING ANIMATIONS SYSTEM
   ================================================== */

/* Demo 1: Emerald Glow Pulse & Staggered Reveal */
.anim-demo1 .hero-slide-text h2 {
  animation: floatInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
.anim-demo1 .hero-slide-text p {
  animation: floatInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
}
.anim-demo1 .hero-offer-pill {
  animation: glowPulse 2.5s infinite alternate, floatInUp 0.6s ease forwards;
}
.anim-demo1 .hero-slide-btns {
  animation: floatInUp 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.3s forwards;
}

@keyframes floatInUp {
  0% { opacity: 0; transform: translateY(35px) scale(0.96); }
  100% { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes glowPulse {
  0% { box-shadow: 0 0 15px rgba(16, 185, 129, 0.4); }
  100% { box-shadow: 0 0 30px rgba(56, 189, 248, 0.8), 0 0 50px rgba(16, 185, 129, 0.6); }
}

/* Demo 2: Tesla/Apple Style Curtain Split Reveal */
.curtain-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  flex-direction: column;
  pointer-events: none;
}
.curtain-panel {
  flex: 1;
  background: linear-gradient(135deg, #064e3b 0%, #022c22 50%, #0f172a 100%);
  transition: transform 1.1s cubic-bezier(0.77, 0, 0.175, 1);
  display: flex;
  align-items: center;
  justify-content: center;
}
.curtain-top { transform: translateY(0); border-bottom: 2px solid #10b981; }
.curtain-bottom { transform: translateY(0); border-top: 2px solid #0284c7; }

.curtain-split .curtain-top { transform: translateY(-100%); }
.curtain-split .curtain-bottom { transform: translateY(100%); }

.curtain-center-logo {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 100000;
  text-align: center;
  color: #fff;
  transition: opacity 0.5s ease, transform 0.5s ease;
}
.curtain-split .curtain-center-logo {
  opacity: 0;
  transform: translate(-50%, -50%) scale(1.3);
  pointer-events: none;
}
.curtain-logo-badge {
  background: rgba(6, 78, 59, 0.85);
  border: 2px solid #34d399;
  box-shadow: 0 0 50px rgba(52, 211, 153, 0.5);
  border-radius: 20px;
  padding: 24px 36px;
  backdrop-filter: blur(16px);
}

/* Demo 3: 3D Particle Shimmer & Appliance Explosive Cards */
.anim-demo3 .hero-slide-text {
  animation: scale3dPop 0.9s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}
@keyframes scale3dPop {
  0% { opacity: 0; transform: perspective(800px) rotateX(25deg) translateY(40px) scale(0.9); }
  100% { opacity: 1; transform: perspective(800px) rotateX(0deg) translateY(0) scale(1); }
}

.particles-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 2;
}
.particle {
  position: absolute;
  width: 8px;
  height: 8px;
  background: #34d399;
  border-radius: 50%;
  box-shadow: 0 0 12px #34d399, 0 0 20px #38bdf8;
  animation: floatUpParticle 3s infinite ease-in-out;
}

@keyframes floatUpParticle {
  0% { transform: translateY(100vh) scale(0); opacity: 0; }
  50% { opacity: 1; }
  100% { transform: translateY(-10vh) scale(1.5); opacity: 0; }
}

/* Floating Animation Demo Switcher Bar */
.demo-switcher-bar {
  position: fixed;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 9999;
  background: rgba(15, 23, 42, 0.92);
  border: 1.5px solid rgba(52, 211, 153, 0.4);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5), 0 0 20px rgba(16, 185, 129, 0.25);
  border-radius: 50px;
  padding: 8px 16px;
  display: flex;
  align-items: center;
  gap: 10px;
  backdrop-filter: blur(12px);
}
.demo-btn {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e2e8f0;
  padding: 8px 16px;
  border-radius: 30px;
  font-size: 12.5px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 6px;
}
.demo-btn:hover {
  background: rgba(16, 185, 129, 0.25);
  color: #a7f3d0;
  border-color: #34d399;
}
.demo-btn.active {
  background: linear-gradient(135deg, #059669 0%, #0284c7 100%);
  color: #ffffff;
  border-color: #38bdf8;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.4);
}
`;

  fs.appendFileSync(homeCssPath, newCssContent, 'utf8');
  console.log("✅ Successfully updated Home.css with Landing Animation Demo styles!");
}

addLandingAnimationDemos();
