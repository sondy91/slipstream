import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

export default function Splash({ onEnter }) {
  return (
    <div style={{ width:"100vw", height:"100vh", background:"#04020e", overflow:"hidden", position:"relative" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=Barlow+Condensed:wght@200;300;400;600;700&display=swap');`}</style>
      <TunnelSplash onEnter={onEnter} />
    </div>
  );
}

function TunnelSplash({ onEnter }) {
  const mountRef  = useRef(null);
  const rafRef    = useRef(null);
  const [showCTA, setShowCTA] = useState(false);
  const showCTARef = useRef(false);

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(el.offsetWidth, el.offsetHeight);
    renderer.setClearColor(0x04020e, 1);
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    scene.fog    = new THREE.FogExp2(0x04020e, 0.055);

    const camera = new THREE.PerspectiveCamera(90, el.offsetWidth / el.offsetHeight, 0.1, 60);
    camera.position.set(0, 0, 0);

    const RADIUS     = 3.2;
    const RING_COUNT = 40;
    const RING_SEGS  = 32;
    const RAIL_COUNT = 16;
    const TUNNEL_LEN = 50;

    const cyanMat   = new THREE.LineBasicMaterial({ color: 0x00d4ff, transparent: true, opacity: 0.55 });
    const purpleMat = new THREE.LineBasicMaterial({ color: 0xb44fff, transparent: true, opacity: 0.40 });
    const dimMat    = new THREE.LineBasicMaterial({ color: 0x1a3050, transparent: true, opacity: 0.25 });

    const tunnelGroup = new THREE.Group();
    scene.add(tunnelGroup);

    for (let r = 0; r < RING_COUNT; r++) {
      const z   = -2 - (r / RING_COUNT) * TUNNEL_LEN;
      const pts = [];
      for (let s = 0; s <= RING_SEGS; s++) {
        const a = (s / RING_SEGS) * Math.PI * 2;
        pts.push(new THREE.Vector3(Math.cos(a) * RADIUS, Math.sin(a) * RADIUS, z));
      }
      const geo  = new THREE.BufferGeometry().setFromPoints(pts);
      const frac = r / RING_COUNT;
      const mat  = frac < 0.3 ? cyanMat : frac < 0.7 ? purpleMat : dimMat;
      tunnelGroup.add(new THREE.Line(geo, mat));
    }

    for (let r = 0; r < RAIL_COUNT; r++) {
      const a   = (r / RAIL_COUNT) * Math.PI * 2;
      const x   = Math.cos(a) * RADIUS;
      const y   = Math.sin(a) * RADIUS;
      const pts = [new THREE.Vector3(x, y, 0), new THREE.Vector3(x, y, -TUNNEL_LEN)];
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      tunnelGroup.add(new THREE.Line(geo, dimMat));
    }

    const STREAK_COUNT = 80;
    const streakGroup  = new THREE.Group();
    scene.add(streakGroup);

    const makeStreak = () => {
      const angle  = Math.random() * Math.PI * 2;
      const r      = RADIUS * (0.2 + Math.random() * 0.75);
      const x      = Math.cos(angle) * r;
      const y      = Math.sin(angle) * r;
      const zStart = -(2 + Math.random() * (TUNNEL_LEN - 2));
      const len    = 0.5 + Math.random() * 3;
      const pts    = [new THREE.Vector3(x, y, zStart), new THREE.Vector3(x, y, zStart + len)];
      const geo    = new THREE.BufferGeometry().setFromPoints(pts);
      const color  = Math.random() < 0.6 ? 0x00d4ff : 0xb44fff;
      const mat    = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.15 + Math.random() * 0.55 });
      const line   = new THREE.Line(geo, mat);
      line.userData = { speed: 0.3 + Math.random() * 0.8, len };
      return line;
    };
    for (let i = 0; i < STREAK_COUNT; i++) streakGroup.add(makeStreak());

    // Logo overlay canvas
    let logoAlpha = 0, tagAlpha = 0;
    const overlay = document.createElement("canvas");
    overlay.style.cssText = "position:absolute;inset:0;pointer-events:none;";
    el.appendChild(overlay);
    const oc = overlay.getContext("2d");
    const resizeOverlay = () => {
      overlay.width  = el.offsetWidth;
      overlay.height = el.offsetHeight;
    };
    resizeOverlay();

    const drawOverlay = () => {
      const W = overlay.width, H = overlay.height;
      oc.clearRect(0, 0, W, H);
      if (logoAlpha <= 0) return;

      oc.save(); oc.globalAlpha = logoAlpha;
      const lg = oc.createRadialGradient(W/2, H/2, 0, W/2, H/2, 160);
      lg.addColorStop(0,   `rgba(0,212,255,${0.18 * logoAlpha})`);
      lg.addColorStop(0.5, `rgba(180,79,255,${0.07 * logoAlpha})`);
      lg.addColorStop(1,   "transparent");
      oc.fillStyle = lg; oc.fillRect(0, 0, W, H);

      oc.save(); oc.translate(W/2, H/2 - 44);
      oc.beginPath(); oc.arc(0, 0, 26, 0, Math.PI * 2);
      oc.strokeStyle = `rgba(0,212,255,${0.35 * logoAlpha})`; oc.lineWidth = 1; oc.stroke();
      oc.beginPath(); oc.moveTo(0, -17); oc.lineTo(14, 13); oc.lineTo(-14, 13); oc.closePath();
      const tg = oc.createLinearGradient(0, -17, 0, 13);
      tg.addColorStop(0, "#00d4ff"); tg.addColorStop(1, "#b44fff");
      oc.strokeStyle = tg; oc.lineWidth = 1.5; oc.stroke(); oc.restore();

      const fs = Math.min(W * 0.075, 66);
      oc.font = `700 ${fs}px 'Rajdhani', sans-serif`; oc.textAlign = "center";
      const wg = oc.createLinearGradient(W/2 - 200, 0, W/2 + 200, 0);
      wg.addColorStop(0, "#b44fff"); wg.addColorStop(0.5, "#ffffff"); wg.addColorStop(1, "#00d4ff");
      oc.fillStyle = wg; oc.fillText("SLIPSTREAM", W/2, H/2 + 26);
      oc.restore();

      if (tagAlpha > 0) {
        oc.save(); oc.globalAlpha = tagAlpha; oc.textAlign = "center";
        oc.font = `300 ${Math.min(W * 0.016, 13)}px 'Barlow Condensed', sans-serif`;
        oc.fillStyle = "rgba(0,212,255,0.7)";
        oc.fillText("ZERO FRICTION  ·  MAXIMUM VELOCITY", W/2, H/2 + 64);
        oc.restore();
      }
    };

    const onResize = () => {
      camera.aspect = el.offsetWidth / el.offsetHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(el.offsetWidth, el.offsetHeight);
      resizeOverlay();
    };
    window.addEventListener("resize", onResize);

    let frame = 0;
    const animate = () => {
      rafRef.current = requestAnimationFrame(animate);
      frame++;

      tunnelGroup.children.forEach(obj => {
        obj.position.z += 0.08;
        if (obj.position.z > 2) obj.position.z -= TUNNEL_LEN / RING_COUNT;
      });

      streakGroup.children.forEach(line => {
        line.position.z += line.userData.speed * 0.1;
        if (line.position.z > 3) {
          const angle = Math.random() * Math.PI * 2;
          const r = RADIUS * (0.2 + Math.random() * 0.75);
          const pts = [
            new THREE.Vector3(Math.cos(angle)*r, Math.sin(angle)*r, 0),
            new THREE.Vector3(Math.cos(angle)*r, Math.sin(angle)*r, line.userData.len),
          ];
          line.geometry.setFromPoints(pts);
          line.position.z = -(2 + Math.random() * (TUNNEL_LEN - 4));
        }
      });

      camera.position.x = Math.sin(frame * 0.008) * 0.12;
      camera.position.y = Math.cos(frame * 0.006) * 0.08;
      camera.lookAt(camera.position.x * 0.5, camera.position.y * 0.5, -5);

      if (frame > 20)  logoAlpha = Math.min(1, logoAlpha + 0.05);
      if (frame > 50)  tagAlpha  = Math.min(1, tagAlpha  + 0.04);

      // Auto-transition once animation completes
      if (tagAlpha >= 0.99 && !showCTARef.current) {
        showCTARef.current = true;
        setTimeout(() => onEnter(), 1000); // Wait 1 second after fade in completes
      }

      renderer.render(scene, camera);
      drawOverlay();
    };
    animate();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      if (el.contains(overlay)) el.removeChild(overlay);
    };
  }, []);

  return (
    <div ref={mountRef} style={{ width:"100%", height:"100%", position:"relative" }} />
  );
}
