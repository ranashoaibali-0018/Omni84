import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import {
  Gamepad2,
  Volume2,
  VolumeX,
  RotateCcw,
  Trophy,
  Zap,
  Shield,
  Eye,
  Compass,
  ArrowRight,
  Maximize2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface GameState {
  score: number;
  energy: number;
  crystalsRemaining: number;
  timeRemaining: number;
  gameStatus: 'title' | 'playing' | 'gameover' | 'victory';
}

export const CyberRoverGame: React.FC = () => {
  const mountRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    energy: 100,
    crystalsRemaining: 8,
    timeRemaining: 90,
    gameStatus: 'title',
  });
  const [isMuted, setIsMuted] = useState(false);
  const [isDockCollapsed, setIsDockCollapsed] = useState(false);
  const [cameraMode, setCameraMode] = useState<'chase' | 'orbit' | 'cockpit'>('chase');

  // Mutable game refs to prevent React state updates from interrupting the 60fps loop
  const loopRef = useRef<{
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    renderer: THREE.WebGLRenderer;
    controls: OrbitControls;
    roverGroup: THREE.Group;
    crystals: THREE.Mesh[];
    keys: Record<string, boolean>;
    velocity: THREE.Vector3;
    roverSpeed: number;
    roverRotation: number;
    audioCtx: AudioContext | null;
    isMuted: boolean;
    cameraMode: 'chase' | 'orbit' | 'cockpit';
    status: 'title' | 'playing' | 'gameover' | 'victory';
    energy: number;
    score: number;
    crystalsRemaining: number;
    timeRemaining: number;
    lastTime: number;
    animFrameId: number;
  } | null>(null);

  // Procedural Web Audio Sound Synthesizer (Zero External MP3s / Zero 404s)
  const playSynthSound = (type: 'engine' | 'crystal' | 'boost' | 'victory' | 'gameover') => {
    if (!loopRef.current || loopRef.current.isMuted) return;
    try {
      if (!loopRef.current.audioCtx) {
        loopRef.current.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = loopRef.current.audioCtx;
      if (ctx.state === 'suspended') ctx.resume();

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      if (type === 'crystal') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(587.33, now); // D5
        osc.frequency.exponentialRampToValueAtTime(1174.66, now + 0.18); // D6
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
        osc.start(now);
        osc.stop(now + 0.35);
      } else if (type === 'boost') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(320, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else if (type === 'victory') {
        const chord = [523.25, 659.25, 783.99, 1046.5]; // C major fanfare
        chord.forEach((freq, idx) => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.connect(g);
          g.connect(ctx.destination);
          o.type = 'triangle';
          o.frequency.setValueAtTime(freq, now + idx * 0.1);
          g.gain.setValueAtTime(0.2, now + idx * 0.1);
          g.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.1 + 0.6);
          o.start(now + idx * 0.1);
          o.stop(now + idx * 0.1 + 0.6);
        });
      } else if (type === 'gameover') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(260, now);
        osc.frequency.linearRampToValueAtTime(65, now + 0.6);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.start(now);
        osc.stop(now + 0.6);
      }
    } catch {}
  };

  useEffect(() => {
    if (!mountRef.current) return;
    const container = mountRef.current;
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // Detect software WebGL
    const isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    // 1. Scene, Camera, PBR Renderer
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x060913);
    scene.fog = new THREE.FogExp2(0x060913, 0.015);

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(0, 8, 16);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.replaceChildren(renderer.domElement);

    // OrbitControls for manual camera rotation
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05;
    controls.minDistance = 4;
    controls.maxDistance = 45;

    // 2. Studio Environment Reflection via RoomEnvironment (Zero 404s)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // 3. Studio Lighting Rig: Warm Key Light, Cool Hemisphere Light, Accent Neon Lights
    const hemiLight = new THREE.HemisphereLight(0x7dd3fc, 0x0f172a, 0.65);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffecd1, 1.4);
    keyLight.position.set(25, 35, 20);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 5;
    keyLight.shadow.camera.far = 120;
    const d = 40;
    keyLight.shadow.camera.left = -d;
    keyLight.shadow.camera.right = d;
    keyLight.shadow.camera.top = d;
    keyLight.shadow.camera.bottom = -d;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    // 4. Procedural Terrain with CanvasTexture Grid (Zero 404s)
    const gridCanvas = document.createElement('canvas');
    gridCanvas.width = 512;
    gridCanvas.height = 512;
    const gctx = gridCanvas.getContext('2d')!;
    gctx.fillStyle = '#0a0f24';
    gctx.fillRect(0, 0, 512, 512);
    gctx.strokeStyle = '#2563eb';
    gctx.lineWidth = 2;
    for (let i = 0; i <= 512; i += 64) {
      gctx.beginPath();
      gctx.moveTo(i, 0);
      gctx.lineTo(i, 512);
      gctx.stroke();
      gctx.beginPath();
      gctx.moveTo(0, i);
      gctx.lineTo(512, i);
      gctx.stroke();
    }
    // Hex accents
    gctx.fillStyle = '#06b6d4';
    for (let x = 32; x < 512; x += 128) {
      for (let y = 32; y < 512; y += 128) {
        gctx.fillRect(x - 3, y - 3, 6, 6);
      }
    }

    const terrainTexture = new THREE.CanvasTexture(gridCanvas);
    terrainTexture.wrapS = THREE.RepeatWrapping;
    terrainTexture.wrapT = THREE.RepeatWrapping;
    terrainTexture.repeat.set(24, 24);
    terrainTexture.colorSpace = THREE.SRGBColorSpace;
    terrainTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    const terrainGeo = new THREE.PlaneGeometry(160, 160, 40, 40);
    const terrainMat = new THREE.MeshStandardMaterial({
      map: terrainTexture,
      roughness: 0.8,
      metalness: 0.2,
    });
    const terrain = new THREE.Mesh(terrainGeo, terrainMat);
    terrain.rotation.x = -Math.PI / 2;
    terrain.receiveShadow = !isSoftwareGl;
    scene.add(terrain);

    // Natural Perimeter Boulders (Procedural Instanced Rocks)
    const rockGeo = new THREE.DodecahedronGeometry(2.5, 1);
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.9,
      metalness: 0.1,
    });
    const rockCount = 36;
    const rockMesh = new THREE.InstancedMesh(rockGeo, rockMat, rockCount);
    const dummy = new THREE.Object3D();
    for (let i = 0; i < rockCount; i++) {
      const angle = (i / rockCount) * Math.PI * 2;
      const radius = 68 + (Math.sin(i * 3) * 6);
      dummy.position.set(Math.cos(angle) * radius, 1.5, Math.sin(angle) * radius);
      const s = 1 + Math.sin(i * 5) * 0.4;
      dummy.scale.set(s, s * 1.5, s);
      dummy.rotation.set(i * 0.4, i * 0.7, 0);
      dummy.updateMatrix();
      rockMesh.setMatrixAt(i, dummy.matrix);
    }
    rockMesh.receiveShadow = !isSoftwareGl;
    scene.add(rockMesh);

    // 5. Composite 3–12 Part Procedural Cyber-Rover Model (THREE.Group)
    const roverGroup = new THREE.Group();

    // Part 1: Main Chassis Body (Beveled primary silhouette)
    const chassisGeo = new THREE.BoxGeometry(2.6, 0.8, 4.2);
    const chassisMat = new THREE.MeshPhysicalMaterial({
      color: 0x1e1b4b,
      metalness: 0.85,
      roughness: 0.2,
      clearcoat: 0.8,
    });
    const chassis = new THREE.Mesh(chassisGeo, chassisMat);
    chassis.position.y = 1.0;
    chassis.castShadow = !isSoftwareGl;
    roverGroup.add(chassis);

    // Part 2: Cockpit Canopy Glass (Translucent aerodynamic canopy)
    const canopyGeo = new THREE.BoxGeometry(1.8, 0.7, 2.2);
    const canopyMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      metalness: 0.1,
      roughness: 0.05,
      transmission: isSoftwareGl ? 0 : 0.8,
      transparent: true,
      opacity: isSoftwareGl ? 0.6 : 0.95,
      ior: 1.5,
    });
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 1.6, -0.2);
    canopy.castShadow = !isSoftwareGl;
    roverGroup.add(canopy);

    // Part 3: Glowing Power Core Sensor Dome
    const domeGeo = new THREE.SphereGeometry(0.45, 16, 16);
    const domeMat = new THREE.MeshStandardMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 2.0,
      roughness: 0.1,
    });
    const dome = new THREE.Mesh(domeGeo, domeMat);
    dome.position.set(0, 2.0, 0.3);
    roverGroup.add(dome);

    // Part 4: Dual Front Cyber LED Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const headlightGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.25, 12);
    const leftHeadlight = new THREE.Mesh(headlightGeo, lightMat);
    leftHeadlight.rotation.x = Math.PI / 2;
    leftHeadlight.position.set(-0.9, 1.0, -2.15);
    const rightHeadlight = leftHeadlight.clone();
    rightHeadlight.position.x = 0.9;
    roverGroup.add(leftHeadlight);
    roverGroup.add(rightHeadlight);

    // Parts 5-8: All-Terrain Cyber Wheels with Metal Hubs
    const wheelGeo = new THREE.CylinderGeometry(0.65, 0.65, 0.55, 20);
    wheelGeo.rotateZ(Math.PI / 2);
    const wheelMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.75,
      metalness: 0.3,
    });
    const hubMat = new THREE.MeshStandardMaterial({
      color: 0x6366f1,
      metalness: 0.9,
      roughness: 0.15,
    });

    const wheelPositions = [
      [-1.5, 0.65, -1.4],
      [1.5, 0.65, -1.4],
      [-1.5, 0.65, 1.4],
      [1.5, 0.65, 1.4],
    ];

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheelAssembly = new THREE.Group();
      const tire = new THREE.Mesh(wheelGeo, wheelMat);
      tire.castShadow = !isSoftwareGl;
      wheelAssembly.add(tire);

      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.58, 12), hubMat);
      hub.rotateZ(Math.PI / 2);
      wheelAssembly.add(hub);

      wheelAssembly.position.set(wx, wy, wz);
      roverGroup.add(wheelAssembly);
    });

    // Part 9: Dual Rear Aerodynamic Neon Wings / Thrusters
    const wingGeo = new THREE.BoxGeometry(0.2, 0.9, 1.2);
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x4f46e5, metalness: 0.8, roughness: 0.3 });
    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(-1.1, 1.5, 1.6);
    leftWing.rotation.x = -0.2;
    const rightWing = leftWing.clone();
    rightWing.position.x = 1.1;
    roverGroup.add(leftWing);
    roverGroup.add(rightWing);

    // Part 10: Soft Radial Contact Shadow Grounding
    const contactShadowGeo = new THREE.PlaneGeometry(3.6, 5.0);
    const shadowCanvas = document.createElement('canvas');
    shadowCanvas.width = 128;
    shadowCanvas.height = 128;
    const sctx = shadowCanvas.getContext('2d')!;
    const grad = sctx.createRadialGradient(64, 64, 10, 64, 64, 60);
    grad.addColorStop(0, 'rgba(0,0,0,0.7)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sctx.fillStyle = grad;
    sctx.fillRect(0, 0, 128, 128);
    const shadowTex = new THREE.CanvasTexture(shadowCanvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.6,
    });
    const contactShadow = new THREE.Mesh(contactShadowGeo, shadowMat);
    contactShadow.rotation.x = -Math.PI / 2;
    contactShadow.position.y = 0.03;
    roverGroup.add(contactShadow);

    scene.add(roverGroup);

    // 6. Procedural Energy Crystals to Collect
    const crystals: THREE.Mesh[] = [];
    const crystalGeo = new THREE.OctahedronGeometry(1.0, 0);
    const crystalMat = new THREE.MeshPhysicalMaterial({
      color: 0x06b6d4,
      emissive: 0x06b6d4,
      emissiveIntensity: 1.2,
      roughness: 0.1,
      metalness: 0.1,
      transmission: isSoftwareGl ? 0 : 0.8,
      transparent: true,
      opacity: 0.9,
    });

    const crystalSpawnCoords = [
      [15, -18],
      [-22, 14],
      [28, 20],
      [-16, -26],
      [36, -8],
      [-32, -12],
      [10, 32],
      [-8, 25],
    ];

    crystalSpawnCoords.forEach(([cx, cz]) => {
      const crystal = new THREE.Mesh(crystalGeo, crystalMat);
      crystal.position.set(cx, 1.4, cz);
      crystal.castShadow = !isSoftwareGl;
      scene.add(crystal);
      crystals.push(crystal);
    });

    // 7. Input Event Handling (WASD / Arrows)
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = true;
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.key.toLowerCase()] = false;
    };
    const onBlur = () => {
      for (const k in keys) keys[k] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', onBlur);

    // Window Resize Handler
    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth || window.innerWidth;
      const h = mountRef.current.clientHeight || window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    // Initialize loop ref state
    loopRef.current = {
      scene,
      camera,
      renderer,
      controls,
      roverGroup,
      crystals,
      keys,
      velocity: new THREE.Vector3(),
      roverSpeed: 0,
      roverRotation: 0,
      audioCtx: null,
      isMuted: false,
      cameraMode: 'chase',
      status: 'title',
      energy: 100,
      score: 0,
      crystalsRemaining: crystals.length,
      timeRemaining: 90,
      lastTime: performance.now(),
      animFrameId: 0,
    };

    // 8. 60fps Game Loop with Clamped Delta Time
    let lastSecondTimestamp = performance.now();

    const tick = (now: number) => {
      const state = loopRef.current;
      if (!state) return;

      const rawDt = (now - state.lastTime) / 1000;
      state.lastTime = now;
      const dt = Math.min(rawDt, 0.05); // Clamp dt to prevent tunneling

      // Animate floating crystals
      state.crystals.forEach((crystal, idx) => {
        crystal.rotation.y += dt * 1.5;
        crystal.position.y = 1.4 + Math.sin(now * 0.003 + idx) * 0.25;
      });

      // Simulation Logic when Playing
      if (state.status === 'playing') {
        // Countdown timer
        if (now - lastSecondTimestamp >= 1000) {
          state.timeRemaining = Math.max(0, state.timeRemaining - 1);
          lastSecondTimestamp = now;

          if (state.timeRemaining <= 0) {
            state.status = 'gameover';
            playSynthSound('gameover');
            setGameState((prev) => ({ ...prev, gameStatus: 'gameover' }));
          }
        }

        // Accelerate / Brake / Steer
        const isUp = state.keys['w'] || state.keys['arrowup'];
        const isDown = state.keys['s'] || state.keys['arrowdown'];
        const isLeft = state.keys['a'] || state.keys['arrowleft'];
        const isRight = state.keys['d'] || state.keys['arrowright'];
        const isBoost = state.keys[' '] && state.energy > 5;

        const maxForwardSpeed = isBoost ? 22 : 14;
        const acceleration = isBoost ? 32 : 18;
        const drag = 8;

        if (isBoost) {
          state.energy = Math.max(0, state.energy - dt * 25);
          playSynthSound('boost');
        } else {
          state.energy = Math.min(100, state.energy + dt * 6);
        }

        if (isUp) {
          state.roverSpeed = Math.min(maxForwardSpeed, state.roverSpeed + acceleration * dt);
        } else if (isDown) {
          state.roverSpeed = Math.max(-8, state.roverSpeed - acceleration * dt);
        } else {
          // Friction drag
          if (state.roverSpeed > 0) state.roverSpeed = Math.max(0, state.roverSpeed - drag * dt);
          else if (state.roverSpeed < 0) state.roverSpeed = Math.min(0, state.roverSpeed + drag * dt);
        }

        const turnSpeed = 2.4;
        if (isLeft) state.roverRotation += turnSpeed * dt * (state.roverSpeed >= 0 ? 1 : -1);
        if (isRight) state.roverRotation -= turnSpeed * dt * (state.roverSpeed >= 0 ? 1 : -1);

        state.roverGroup.rotation.y = state.roverRotation;

        // Position translation
        const moveDist = state.roverSpeed * dt;
        state.roverGroup.position.x -= Math.sin(state.roverRotation) * moveDist;
        state.roverGroup.position.z -= Math.cos(state.roverRotation) * moveDist;

        // Boundary constraint
        const bound = 64;
        state.roverGroup.position.x = Math.max(-bound, Math.min(bound, state.roverGroup.position.x));
        state.roverGroup.position.z = Math.max(-bound, Math.min(bound, state.roverGroup.position.z));

        // Crystal collision detection
        for (let i = state.crystals.length - 1; i >= 0; i--) {
          const c = state.crystals[i];
          const dist = state.roverGroup.position.distanceTo(c.position);
          if (dist < 2.5) {
            scene.remove(c);
            state.crystals.splice(i, 1);
            state.score += 250;
            state.energy = Math.min(100, state.energy + 20);
            playSynthSound('crystal');

            state.crystalsRemaining = state.crystals.length;
            if (state.crystalsRemaining === 0) {
              state.status = 'victory';
              playSynthSound('victory');
              setGameState((prev) => ({
                ...prev,
                gameStatus: 'victory',
                score: state.score + state.timeRemaining * 10,
              }));
            }
          }
        }

        // Camera Modes
        if (state.cameraMode === 'chase') {
          const chaseOffset = new THREE.Vector3(
            Math.sin(state.roverRotation) * 11,
            5.5,
            Math.cos(state.roverRotation) * 11
          );
          state.camera.position.lerp(state.roverGroup.position.clone().add(chaseOffset), 0.12);
          state.camera.lookAt(state.roverGroup.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
        } else if (state.cameraMode === 'cockpit') {
          state.camera.position.copy(state.roverGroup.position).add(new THREE.Vector3(0, 1.8, 0));
          const target = state.roverGroup.position
            .clone()
            .sub(new THREE.Vector3(Math.sin(state.roverRotation) * 20, -0.5, Math.cos(state.roverRotation) * 20));
          state.camera.lookAt(target);
        } else {
          state.controls.target.copy(state.roverGroup.position);
          state.controls.update();
        }

        // Sync local React HUD state periodically
        setGameState((prev) => ({
          ...prev,
          score: state.score,
          energy: Math.round(state.energy),
          crystalsRemaining: state.crystalsRemaining,
          timeRemaining: state.timeRemaining,
        }));
      } else {
        // Slow cinematic orbit on Title / Gameover screens
        state.roverGroup.position.set(0, 0, 0);
        state.roverRotation += dt * 0.4;
        state.roverGroup.rotation.y = state.roverRotation;
        state.camera.position.set(Math.sin(now * 0.0006) * 15, 6, Math.cos(now * 0.0006) * 15);
        state.camera.lookAt(0, 1, 0);
      }

      renderer.render(scene, camera);
      state.animFrameId = requestAnimationFrame(tick);
    };

    loopRef.current.animFrameId = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
      window.removeEventListener('resize', onResize);
      if (loopRef.current) {
        cancelAnimationFrame(loopRef.current.animFrameId);
        loopRef.current.renderer.dispose();
      }
    };
  }, []);

  // Start game action
  const handleStartGame = () => {
    if (!loopRef.current) return;
    loopRef.current.status = 'playing';
    loopRef.current.score = 0;
    loopRef.current.energy = 100;
    loopRef.current.timeRemaining = 90;
    loopRef.current.roverSpeed = 0;
    loopRef.current.roverRotation = 0;
    loopRef.current.roverGroup.position.set(0, 0, 0);

    setGameState({
      score: 0,
      energy: 100,
      crystalsRemaining: loopRef.current.crystals.length,
      timeRemaining: 90,
      gameStatus: 'playing',
    });
  };

  const handleRestart = () => {
    window.location.reload();
  };

  const toggleSound = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (loopRef.current) loopRef.current.isMuted = next;
  };

  const setCameraView = (mode: 'chase' | 'orbit' | 'cockpit') => {
    setCameraMode(mode);
    if (loopRef.current) loopRef.current.cameraMode = mode;
  };

  return (
    <div className="relative w-full h-[calc(100vh-68px)] overflow-hidden bg-slate-950 select-none">
      {/* 3D WebGL Canvas Container */}
      <div ref={mountRef} className="absolute inset-0 w-full h-full" />

      {/* TITLE SCREEN OVERLAY */}
      {gameState.gameStatus === 'title' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/70 backdrop-blur-sm z-30 animate-in fade-in duration-300">
          <div className="max-w-xl text-center space-y-5">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Gamepad2 className="w-4 h-4 text-indigo-400" />
              <span>Three.js 3D Physics Simulation</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight uppercase">
              Omni<span className="bg-gradient-to-r from-cyan-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">Rover</span> 3D
            </h1>

            <p className="text-slate-300 text-sm leading-relaxed max-w-md mx-auto">
              Pilot the autonomous composite cyber-rover across the alien sector. Harvest 8 quantum energy crystals before your time runs out.
            </p>

            {/* Control hints */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-400 font-mono py-2">
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                WASD / Arrows · Steer & Drive
              </span>
              <span className="px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-slate-200">
                Space · Plasma Booster
              </span>
            </div>

            <button
              onClick={handleStartGame}
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-extrabold text-base shadow-2xl shadow-indigo-500/40 transform hover:scale-105 transition duration-200 cursor-pointer"
            >
              Launch Mission (Enter)
            </button>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {gameState.gameStatus === 'gameover' && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md z-30 animate-in zoom-in-95">
          <div className="max-w-sm w-full bg-slate-900 border border-rose-500/40 p-6 rounded-3xl text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <RotateCcw className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Mission Timed Out</h2>
            <p className="text-xs text-slate-400">
              The sector energy collapsed before all crystals were collected. Final Score: {gameState.score}.
            </p>
            <button
              onClick={handleStartGame}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition"
            >
              Try Again
            </button>
          </div>
        </div>
      )}

      {/* VICTORY MODAL */}
      {gameState.gameStatus === 'victory' && (
        <div className="absolute inset-0 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-md z-30 animate-in zoom-in-95">
          <div className="max-w-sm w-full bg-slate-900 border border-emerald-500/40 p-6 rounded-3xl text-center space-y-4 shadow-2xl">
            <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <Trophy className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-white">Mission Complete!</h2>
            <p className="text-xs text-slate-400">
              All 8 quantum crystals secured! Total Verified Score: <span className="font-bold text-emerald-400">{gameState.score}</span> pts.
            </p>
            <button
              onClick={handleStartGame}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition"
            >
              Play Again
            </button>
          </div>
        </div>
      )}

      {/* TOP PERIMETER STATUS CLUSTERS (World-matched, Low Occlusion UI) */}
      <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-20">
        {/* Left: Mission Telemetry */}
        <div className="flex items-center gap-3">
          <div className="px-3.5 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">CYBER-ROVER 3D</span>
          </div>

          <div className="px-3 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span className="text-slate-300 tabular-nums font-bold">{gameState.score} PTS</span>
          </div>
        </div>

        {/* Right: Sound toggle and Timer */}
        <div className="flex items-center gap-2.5 pointer-events-auto">
          <button
            onClick={toggleSound}
            className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300 hover:text-white transition"
            title={isMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
          </button>

          <div className="px-3.5 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 text-xs font-mono font-bold text-cyan-300 flex items-center gap-2">
            <span>TIME:</span>
            <span className="tabular-nums text-sm text-white">{gameState.timeRemaining}s</span>
          </div>
        </div>
      </div>

      {/* UNIFIED COLLAPSIBLE BOTTOM CONTROL DOCK (Strict Three.js Skill Directive) */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 w-full max-w-xl px-4 z-20 pointer-events-auto">
        <div className="relative bg-slate-950/90 border border-slate-800/90 rounded-3xl p-3.5 shadow-2xl transition-all">
          {/* Collapse/Expand Toggle Tab */}
          <button
            onClick={() => setIsDockCollapsed(!isDockCollapsed)}
            className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
          >
            {isDockCollapsed ? (
              <>
                <ChevronUp className="w-3 h-3" />
                <span>Show Controls (H)</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                <span>Hide (H)</span>
              </>
            )}
          </button>

          {!isDockCollapsed && (
            <div className="space-y-3 pt-1">
              {/* Energy bar & Crystals Counter */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-semibold text-slate-300">Plasma Energy:</span>
                  <div className="w-32 h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 transition-all duration-150"
                      style={{ width: `${gameState.energy}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-indigo-400">
                  <span>Crystals:</span>
                  <span className="text-white font-bold">{8 - gameState.crystalsRemaining} / 8</span>
                </div>
              </div>

              {/* Camera Perspective Buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Eye className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Perspective:</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {(['chase', 'cockpit', 'orbit'] as const).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => setCameraView(mode)}
                      className={`px-3 py-1 rounded-xl text-xs font-semibold capitalize transition ${
                        cameraMode === mode
                          ? 'bg-indigo-600 text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
