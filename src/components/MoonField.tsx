"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export function MoonField() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
    camera.position.z = 8;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    mount.appendChild(renderer.domElement);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(1.1, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xf8ddb1, transparent: true, opacity: 0.2 }),
    );
    moon.position.set(2.6, 1.25, -1.4);
    scene.add(moon);

    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(1.52, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xf2bd62, transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending }),
    );
    halo.position.copy(moon.position);
    scene.add(halo);

    const particleCount = 110;
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 9;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 5.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 2;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xf5c15d,
      size: 0.026,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    let pointerX = 0;
    let pointerY = 0;
    let animationFrame = 0;

    const resize = () => {
      const { width, height } = mount.getBoundingClientRect();
      renderer.setSize(width, height, false);
      camera.aspect = width / Math.max(height, 1);
      camera.updateProjectionMatrix();
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = (event.clientX / window.innerWidth - 0.5) * 0.45;
      pointerY = (event.clientY / window.innerHeight - 0.5) * 0.28;
    };

    const render = () => {
      moon.rotation.y += reduceMotion ? 0 : 0.0015;
      halo.scale.setScalar(1 + Math.sin(performance.now() * 0.0008) * 0.025);
      particles.rotation.y += reduceMotion ? 0 : 0.00055;
      particles.rotation.x += reduceMotion ? 0 : 0.0002;
      camera.position.x += (pointerX - camera.position.x) * 0.035;
      camera.position.y += (-pointerY - camera.position.y) * 0.035;
      renderer.render(scene, camera);
      if (!reduceMotion) animationFrame = requestAnimationFrame(render);
    };

    resize();
    renderer.render(scene, camera);
    if (!reduceMotion) animationFrame = requestAnimationFrame(render);

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove);

    return () => {
      cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      geometry.dispose();
      material.dispose();
      moon.geometry.dispose();
      halo.geometry.dispose();
      moon.material.dispose();
      halo.material.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={mountRef} className="moon-field" aria-hidden="true" />;
}
