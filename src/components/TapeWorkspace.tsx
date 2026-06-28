import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TapeConfig, PathPoint } from '../types';
import {
  generateTapePattern,
  generateTapeBumpMap,
  generateRollSideTexture,
  generateDeskTexture,
} from '../utils/textureGenerator';

interface TapeWorkspaceProps {
  config: TapeConfig;
  onStatsUpdate: (length: number, overlaps: number) => void;
  clearTrigger: number;
}

export const TapeWorkspace: React.FC<TapeWorkspaceProps> = ({
  config,
  onStatsUpdate,
  clearTrigger,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep a reference to the latest config to use in Three.js render loop without re-running effects
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  // Track stats
  const statsRef = useRef({ length: 0, overlaps: 0 });

  // Refs for scene interaction
  const mouse = useRef(new THREE.Vector2());
  const isDragging = useRef(false);
  const targetPos = useRef(new THREE.Vector3(0, 0, 0));
  const lastPathPointRef = useRef<THREE.Vector3 | null>(null);

  // Arrays to hold path data
  const pathPoints = useRef<PathPoint[]>([]);

  // Three.js Objects references
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const deskRef = useRef<THREE.Mesh | null>(null);
  const rollGroupRef = useRef<THREE.Group | null>(null); // Holds the entire rolling cylinder assembly
  const rollInnerMeshRef = useRef<THREE.Group | null>(null); // Inner assembly that rotates
  const trailMeshRef = useRef<THREE.Mesh | null>(null);

  // Textures
  const tapePatternTexRef = useRef<THREE.CanvasTexture | null>(null);
  const tapeBumpTexRef = useRef<THREE.CanvasTexture | null>(null);
  const rollSideTexRef = useRef<THREE.CanvasTexture | null>(null);
  const deskTexRef = useRef<THREE.CanvasTexture | null>(null);

  // Track active unrolled length for shrinking roll radius
  const [totalLength, setTotalLength] = useState(0);

  // Configuration Constants
  const DEFAULT_WIDTH = 0.6;
  const INITIAL_RADIUS = 0.9;
  const CORE_RADIUS = 0.55;
  const TAPE_THICKNESS = 0.008; // Thickness per overlap layer
  const SLOPE_LIMIT = 0.002; // Soft bridge transition height change per segment

  // Core texture setup function
  const updateTextures = (currentConfig: TapeConfig) => {
    // 1. Tape Pattern
    const patternCanvas = generateTapePattern(currentConfig.pattern);
    if (tapePatternTexRef.current) {
      tapePatternTexRef.current.image = patternCanvas;
      tapePatternTexRef.current.needsUpdate = true;
    } else {
      const tex = new THREE.CanvasTexture(patternCanvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(1, 0.4); // Tile along the tape trail
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.anisotropy = 4;
      tapePatternTexRef.current = tex;
    }

    // 2. Paper Bump Map
    if (!tapeBumpTexRef.current) {
      const bumpCanvas = generateTapeBumpMap();
      const tex = new THREE.CanvasTexture(bumpCanvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(10, 2);
      tapeBumpTexRef.current = tex;
    }

    // 3. Roll Side Wound Paper Texture
    // Determine the base color theme for the side ring of the cylinder
    let baseColor = '#6F806C'; // Sage Green
    if (currentConfig.pattern === 'terracotta_geo') baseColor = '#B85E46';
    if (currentConfig.pattern === 'indigo_constellation') baseColor = '#1D2436';
    if (currentConfig.pattern === 'pastel_grid') baseColor = '#F5EFE6';

    const sideCanvas = generateRollSideTexture(baseColor);
    if (rollSideTexRef.current) {
      rollSideTexRef.current.image = sideCanvas;
      rollSideTexRef.current.needsUpdate = true;
    } else {
      const tex = new THREE.CanvasTexture(sideCanvas);
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      rollSideTexRef.current = tex;
    }

    // 4. Desk Surface Texture
    const deskCanvas = generateDeskTexture(currentConfig.deskMaterial);
    if (deskTexRef.current) {
      deskTexRef.current.image = deskCanvas;
      deskTexRef.current.needsUpdate = true;
    } else {
      const tex = new THREE.CanvasTexture(deskCanvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(4, 4);
      deskTexRef.current = tex;
    }
  };

  // Handle Clear Trigger
  useEffect(() => {
    if (clearTrigger > 0) {
      // Smooth fade-out clear
      const trailMesh = trailMeshRef.current;
      if (trailMesh && trailMesh.material) {
        const mat = trailMesh.material as THREE.MeshStandardMaterial;
        let opacity = 1.0;
        const fadeInterval = setInterval(() => {
          opacity -= 0.1;
          if (opacity <= 0) {
            clearInterval(fadeInterval);
            // Clear path points and reset geometry
            pathPoints.current = [];
            statsRef.current = { length: 0, overlaps: 0 };
            onStatsUpdate(0, 0);
            setTotalLength(0);
            if (trailMesh.geometry) {
              trailMesh.geometry.dispose();
              trailMesh.geometry = new THREE.BufferGeometry();
            }
            mat.opacity = 1.0; // Reset for future draw
            // Move roll back to center
            if (rollGroupRef.current) {
              rollGroupRef.current.position.set(0, INITIAL_RADIUS, 0);
              targetPos.current.set(0, 0, 0);
            }
            lastPathPointRef.current = null;
          } else {
            mat.opacity = opacity;
          }
        }, 30);
      } else {
        pathPoints.current = [];
        statsRef.current = { length: 0, overlaps: 0 };
        onStatsUpdate(0, 0);
        setTotalLength(0);
        if (rollGroupRef.current) {
          rollGroupRef.current.position.set(0, INITIAL_RADIUS, 0);
          targetPos.current.set(0, 0, 0);
        }
        lastPathPointRef.current = null;
      }
    }
  }, [clearTrigger]);

  // Propagate and update textures when config changes
  useEffect(() => {
    updateTextures(config);

    // Update desk material map
    if (deskRef.current && deskTexRef.current) {
      const mat = deskRef.current.material as THREE.MeshStandardMaterial;
      mat.map = deskTexRef.current;
      mat.needsUpdate = true;
    }

    // Update roll side cap textures
    if (rollInnerMeshRef.current && rollSideTexRef.current) {
      rollInnerMeshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material;
          // Apply side texture to Side Caps (RingGeometry meshes)
          if (child.name === 'sideCapLeft' || child.name === 'sideCapRight') {
            const m = mat as THREE.MeshStandardMaterial;
            m.map = rollSideTexRef.current;
            m.needsUpdate = true;
          }
          // Apply washi pattern to outer tube cylinder
          if (child.name === 'outerTapeTube') {
            const m = mat as THREE.MeshStandardMaterial;
            if (tapePatternTexRef.current) {
              m.map = tapePatternTexRef.current;
              m.needsUpdate = true;
            }
          }
        }
      });
    }

    // Update trail mesh material map
    if (trailMeshRef.current && tapePatternTexRef.current) {
      const mat = trailMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.map = tapePatternTexRef.current;
      mat.needsUpdate = true;
    }
  }, [config.pattern, config.deskMaterial, config.width]);

  // Main Three.js Initialization
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#FAF9F6'); // Elegant ivory minimalist bg
    scene.fog = new THREE.FogExp2('#FAF9F6', 0.035);
    sceneRef.current = scene;

    // 2. Camera (Overhead oblique architectural perspective)
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    camera.position.set(0, 11, 11);
    camera.lookAt(0, -0.2, 0);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Initialize textures for starting config
    updateTextures(configRef.current);

    // 4. Lights (High design studio key lighting)
    const ambientLight = new THREE.AmbientLight('#FFFDF2', 0.55);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight('#FFFFFF', 0.85);
    keyLight.position.set(6, 13, 5);
    keyLight.castShadow = true;
    // Configure shadows for maximum quality and smooth edges
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 1;
    keyLight.shadow.camera.far = 28;
    keyLight.shadow.camera.left = -9;
    keyLight.shadow.camera.right = 9;
    keyLight.shadow.camera.top = 9;
    keyLight.shadow.camera.bottom = -9;
    keyLight.shadow.bias = -0.0002;
    keyLight.shadow.radius = 4; // Softer shadows
    scene.add(keyLight);

    // Subtle blue fill light from the opposite side
    const fillLight = new THREE.DirectionalLight('#E0F0FF', 0.25);
    fillLight.position.set(-8, 5, -6);
    scene.add(fillLight);

    // 5. Desk Surface Mesh
    const deskGeo = new THREE.PlaneGeometry(60, 60);
    const deskMat = new THREE.MeshStandardMaterial({
      map: deskTexRef.current,
      roughness: 0.65,
      metalness: 0.05,
    });
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.rotation.x = -Math.PI / 2;
    desk.position.y = 0;
    desk.receiveShadow = true;
    scene.add(desk);
    deskRef.current = desk;

    // 6. Build the hollow 3D Tape Roll Assembly
    const rollGroup = new THREE.Group();
    rollGroup.position.set(0, INITIAL_RADIUS, 0); // rest on ground initially
    scene.add(rollGroup);
    rollGroupRef.current = rollGroup;

    // The inner assembly that rotates as the roll travels
    const rollInnerMesh = new THREE.Group();
    rollGroup.add(rollInnerMesh);
    rollInnerMeshRef.current = rollInnerMesh;

    // Build the cylinder components (Hollow architecture with ring caps and cardboard core)
    const rollWidth = configRef.current.width;

    // Custom Washi Tape Material
    const outerTapeMat = new THREE.MeshStandardMaterial({
      map: tapePatternTexRef.current,
      bumpMap: tapeBumpTexRef.current,
      bumpScale: 0.006,
      roughness: 0.82,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    // Outer Tube representing wound paper tape
    const outerTubeGeo = new THREE.CylinderGeometry(
      INITIAL_RADIUS,
      INITIAL_RADIUS,
      rollWidth,
      64,
      1,
      true // open ended
    );
    outerTubeGeo.rotateX(Math.PI / 2); // Aligns along local Z axis
    const outerTapeTube = new THREE.Mesh(outerTubeGeo, outerTapeMat);
    outerTapeTube.name = 'outerTapeTube';
    outerTapeTube.castShadow = true;
    outerTapeTube.receiveShadow = true;
    rollInnerMesh.add(outerTapeTube);

    // Inner Cardboard Core Tube
    const cardboardMat = new THREE.MeshStandardMaterial({
      color: '#D4C6A2',
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });
    const innerTubeGeo = new THREE.CylinderGeometry(
      CORE_RADIUS,
      CORE_RADIUS,
      rollWidth - 0.002, // slightly recessed
      64,
      1,
      true
    );
    innerTubeGeo.rotateX(Math.PI / 2);
    const innerCardboardTube = new THREE.Mesh(innerTubeGeo, cardboardMat);
    innerCardboardTube.name = 'innerCardboardTube';
    rollInnerMesh.add(innerCardboardTube);

    // Side Rings Caps (Layered Wound spiral texture)
    const sideCapMat = new THREE.MeshStandardMaterial({
      map: rollSideTexRef.current,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
    });

    // Left Ring Cap
    const leftCapGeo = new THREE.RingGeometry(CORE_RADIUS, INITIAL_RADIUS, 64);
    const sideCapLeft = new THREE.Mesh(leftCapGeo, sideCapMat);
    sideCapLeft.name = 'sideCapLeft';
    sideCapLeft.position.z = -rollWidth / 2;
    rollInnerMesh.add(sideCapLeft);

    // Right Ring Cap (rotated facing outward)
    const rightCapGeo = new THREE.RingGeometry(CORE_RADIUS, INITIAL_RADIUS, 64);
    const sideCapRight = new THREE.Mesh(rightCapGeo, sideCapMat);
    sideCapRight.name = 'sideCapRight';
    sideCapRight.position.z = rollWidth / 2;
    sideCapRight.rotation.y = Math.PI;
    rollInnerMesh.add(sideCapRight);

    // 7. Dynamic Trail Ribbon Mesh Setup
    const trailMat = new THREE.MeshStandardMaterial({
      map: tapePatternTexRef.current,
      bumpMap: tapeBumpTexRef.current,
      bumpScale: 0.005,
      roughness: 0.85,
      metalness: 0.0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
    });
    const trailGeo = new THREE.BufferGeometry();
    const trailMesh = new THREE.Mesh(trailGeo, trailMat);
    trailMesh.castShadow = true;
    trailMesh.receiveShadow = true;
    scene.add(trailMesh);
    trailMeshRef.current = trailMesh;

    // Raycasting plane for mouse intersection (sits at Y=0)
    const rayPlaneGeo = new THREE.PlaneGeometry(100, 100);
    const rayPlane = new THREE.Mesh(
      rayPlaneGeo,
      new THREE.MeshBasicMaterial({ visible: false })
    );
    rayPlane.rotation.x = -Math.PI / 2;
    scene.add(rayPlane);

    // Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (rendererRef.current && cameraRef.current) {
          rendererRef.current.setSize(width, height);
          cameraRef.current.aspect = width / height;
          cameraRef.current.updateProjectionMatrix();
        }
      }
    });
    resizeObserver.observe(containerRef.current);

    // Raycast utility
    const raycaster = new THREE.Raycaster();
    const updateTargetPositionFromMouse = (eventX: number, eventY: number) => {
      if (!containerRef.current || !cameraRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.current.x = ((eventX - rect.left) / rect.width) * 2 - 1;
      mouse.current.y = -((eventY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse.current, cameraRef.current);
      const intersects = raycaster.intersectObject(rayPlane);
      if (intersects.length > 0) {
        // Clamp target position to table bounds to keep interaction stable
        targetPos.current.copy(intersects[0].point);
        targetPos.current.x = Math.max(-10, Math.min(10, targetPos.current.x));
        targetPos.current.z = Math.max(-10, Math.min(10, targetPos.current.z));
      }
    };

    // Event Listeners
    const onMouseDown = (e: MouseEvent) => {
      isDragging.current = true;
      updateTargetPositionFromMouse(e.clientX, e.clientY);
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      updateTargetPositionFromMouse(e.clientX, e.clientY);
    };

    const onMouseUp = () => {
      isDragging.current = false;
    };

    // Touch Support
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        isDragging.current = true;
        updateTargetPositionFromMouse(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isDragging.current) return;
      if (e.touches.length > 0) {
        updateTargetPositionFromMouse(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const onTouchEnd = () => {
      isDragging.current = false;
    };

    const containerEl = containerRef.current;
    containerEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    containerEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    // --- REBUILD TAPE TRAIL GEOMETRY ---
    const rebuildTrailMesh = () => {
      const pts = pathPoints.current;
      if (pts.length < 2) return;

      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      const width = configRef.current.width;
      const patternScale = 3.5; // Controls how stretched the design looks along the strip

      for (let i = 0; i < pts.length; i++) {
        const pt = pts[i];
        
        // Expansion offsets on the XZ plane perpendicular to motion
        const ox = pt.nx * (width / 2);
        const oz = pt.nz * (width / 2);

        // Vertices Left & Right (Y-height holds the bridge overlap layers)
        const vlX = pt.x + ox;
        const vlY = pt.y;
        const vlZ = pt.z + oz;

        const vrX = pt.x - ox;
        const vrY = pt.y;
        const vrZ = pt.z - oz;

        positions.push(vlX, vlY, vlZ);
        positions.push(vrX, vrY, vrZ);

        // UV coords mapping: U goes from 0 to 1 across tape width.
        // V coordinates flow seamlessly along the trail based on cumulative distance.
        const v = pt.distance / patternScale;
        uvs.push(0, v);
        uvs.push(1, v);

        // Triangulate quads between points
        if (i < pts.length - 1) {
          const a = i * 2;
          const b = i * 2 + 1;
          const c = (i + 1) * 2;
          const d = (i + 1) * 2 + 1;

          // Triangle 1
          indices.push(a, b, c);
          // Triangle 2
          indices.push(b, d, c);
        }
      }

      if (trailMeshRef.current) {
        const geom = trailMeshRef.current.geometry;
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geom.setIndex(indices);
        geom.computeVertexNormals();
        geom.attributes.position.needsUpdate = true;
        geom.attributes.uv.needsUpdate = true;
        if (geom.index) geom.index.needsUpdate = true;
      }
    };

    // --- MATHEMATICAL OVERLAP STACKING ALGORITHM ---
    const calculateOverlapHeight = (newX: number, newZ: number, width: number): number => {
      const pts = pathPoints.current;
      if (pts.length < 15) return 0.002; // Base height flat on desk

      let highestBase = 0.002;
      let detectedOverlap = false;

      // Scan historical path segments (excluding the very end which is currently unrolling)
      for (let j = 0; j < pts.length - 16; j++) {
        const pt = pts[j];
        // 2D Distance Check on XZ plane
        const dx = newX - pt.x;
        const dz = newZ - pt.z;
        const distSq = dx * dx + dz * dz;

        if (distSq < width * width * 0.9) {
          detectedOverlap = true;
          if (pt.y > highestBase) {
            highestBase = pt.y;
          }
        }
      }

      if (detectedOverlap) {
        statsRef.current.overlaps += 1;
        return highestBase + TAPE_THICKNESS;
      }

      return 0.002;
    };

    // --- HIGH COHESION HEIGHT SMOOTHING PASS ---
    const smoothBridgeHeights = () => {
      const pts = pathPoints.current;
      if (pts.length < 3) return;

      // Run multiple forward/backward smoothing passes on the last 15 points
      // to create a gorgeous natural paper bent "bridge" over crossed tapes.
      const windowSize = 12;
      const startIndex = Math.max(0, pts.length - windowSize);

      // 1. Backward smooth
      for (let i = pts.length - 2; i >= startIndex; i--) {
        const current = pts[i];
        const next = pts[i + 1];
        if (current.y < next.y - SLOPE_LIMIT) {
          current.y = next.y - SLOPE_LIMIT;
        }
      }

      // 2. Forward smooth
      for (let i = startIndex + 1; i < pts.length; i++) {
        const prev = pts[i - 1];
        const current = pts[i];
        if (current.y < prev.y - SLOPE_LIMIT) {
          current.y = prev.y - SLOPE_LIMIT;
        }
      }
    };

    // --- RENDER & ANIMATION LOOP ---
    let animationFrameId: number;
    const prevRollPos = new THREE.Vector3().copy(rollGroup.position);

    const tick = () => {
      // Smooth Follow logic: Ease the tape roll towards the target position
      const currentConfig = configRef.current;
      const easing = 0.12;

      // Sits on top of the desk (Y height matches the current rolling radius)
      // Radius shrinks dynamically as total tape length unrolled increases!
      const currentRadius = Math.max(
        CORE_RADIUS + 0.015,
        Math.sqrt(INITIAL_RADIUS * INITIAL_RADIUS - 0.0016 * statsRef.current.length)
      );

      // Check current trail tail height to make sure the roll rides on top of overlaps too!
      let currentRidingHeight = 0.0;
      if (pathPoints.current.length > 0) {
        currentRidingHeight = pathPoints.current[pathPoints.current.length - 1].y;
      }

      const rollY = currentRadius + currentRidingHeight;

      // Interpolate roll position on XZ plane
      const nextX = THREE.MathUtils.lerp(rollGroup.position.x, targetPos.current.x, easing);
      const nextZ = THREE.MathUtils.lerp(rollGroup.position.z, targetPos.current.z, easing);
      rollGroup.position.set(nextX, rollY, nextZ);

      // Compute displacement
      const displacement = new THREE.Vector3(
        rollGroup.position.x - prevRollPos.x,
        0,
        rollGroup.position.z - prevRollPos.z
      );
      const ds = displacement.length();

      if (ds > 0.001) {
        const moveDir = displacement.clone().normalize();

        // 1. Roll Rotation around local Z axis
        // We accumulate rotation angle. To move forward in local X, we rotate negatively on local Z
        rollInnerMesh.rotation.z -= ds / currentRadius;

        // 2. Roll Heading Angle (Yaw - rotate around world Y axis so it rolls straight)
        // atan2 is based on world coordinates.
        // We align the roll's moving direction with the local X-axis.
        const yaw = Math.atan2(moveDir.x, moveDir.z);
        rollGroup.rotation.y = yaw - Math.PI / 2;

        // 3. Dynamic scale of outer tape tube and side caps to shrink as it unrolls!
        const shrinkScale = currentRadius / INITIAL_RADIUS;
        outerTapeTube.scale.set(shrinkScale, shrinkScale, 1);
        sideCapLeft.scale.set(shrinkScale, shrinkScale, 1);
        sideCapRight.scale.set(shrinkScale, shrinkScale, 1);
        
        // Recalculate side rings geometries outer radius manually or scale them
        // RingGeometry scale works beautifully as they are centered. We also need to scale their positions:
        sideCapLeft.position.z = -currentConfig.width / 2;
        sideCapRight.position.z = currentConfig.width / 2;
        outerTapeTube.scale.z = currentConfig.width / DEFAULT_WIDTH;
        innerCardboardTube.scale.z = (currentConfig.width - 0.002) / DEFAULT_WIDTH;

        // 4. Update Path Trail Point
        if (!lastPathPointRef.current) {
          lastPathPointRef.current = new THREE.Vector3().copy(rollGroup.position);
          lastPathPointRef.current.y = 0.002; // Flat on table base
        }

        const distSinceLast = rollGroup.position.distanceTo(lastPathPointRef.current);
        const recordingThreshold = 0.08; // Point density threshold for perfect smooth curves

        if (distSinceLast > recordingThreshold) {
          // Bottom touch point of the roll on the desk
          const bottomPos = new THREE.Vector3(rollGroup.position.x, 0, rollGroup.position.z);
          
          // Calculate vector perpendicular to path (XZ plane)
          // The perpendicular vector is the local Z axis of the rollGroup in world space!
          // Since the rollGroup is rotated by Y, its local Z unit vector in world space can be retrieved:
          const perpDir = new THREE.Vector3(0, 0, 1).applyQuaternion(rollGroup.quaternion).normalize();

          // Compute stacking height based on historic crossings
          const targetHeight = calculateOverlapHeight(bottomPos.x, bottomPos.z, currentConfig.width);

          // Accumulate length unrolled
          statsRef.current.length += distSinceLast;
          setTotalLength(statsRef.current.length);
          onStatsUpdate(statsRef.current.length, statsRef.current.overlaps);

          // Add new path point
          pathPoints.current.push({
            x: bottomPos.x,
            y: targetHeight,
            z: bottomPos.z,
            nx: perpDir.x,
            nz: perpDir.z,
            distance: statsRef.current.length,
          });

          // Apply gorgeous backward-forward height bridging
          smoothBridgeHeights();

          // Rebuild Trail Mesh
          rebuildTrailMesh();

          // Track last recorded position
          lastPathPointRef.current.copy(rollGroup.position);
          lastPathPointRef.current.y = targetHeight;
        }
      }

      prevRollPos.copy(rollGroup.position);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (containerEl) {
        containerEl.removeEventListener('mousedown', onMouseDown);
        containerEl.removeEventListener('touchstart', onTouchStart);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);

      // Clean Three.js context resources to prevent memory leaks
      scene.clear();
      renderer.dispose();
      deskGeo.dispose();
      deskMat.dispose();
      outerTubeGeo.dispose();
      outerTapeMat.dispose();
      innerTubeGeo.dispose();
      cardboardMat.dispose();
      leftCapGeo.dispose();
      rightCapGeo.dispose();
      sideCapMat.dispose();
      trailGeo.dispose();
      trailMat.dispose();
      rayPlaneGeo.dispose();

      // Dispose textures
      tapePatternTexRef.current?.dispose();
      tapeBumpTexRef.current?.dispose();
      rollSideTexRef.current?.dispose();
      deskTexRef.current?.dispose();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      id="workspace-container"
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden touch-none"
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
      {/* Soft overlay vignette to enhance workspace lighting hierarchy */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_40%,rgba(0,0,0,0.035)_100%)] shadow-inner" />
    </div>
  );
};
