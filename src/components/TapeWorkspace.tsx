import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { TapeConfig, PathPoint, COLORS } from '../types';
import {
  generateTapePattern,
  generateTapeBumpMap,
  generateRollSideTexture,
  generateRollSideBumpMap,
  generateRollSideRoughnessMap,
  generateCardboardCoreTexture,
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

  // Preloaded HTMLImageElement elements for custom user tapes
  const [loadedCustomImages, setLoadedCustomImages] = useState<HTMLImageElement[]>([]);

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
  const rebuildTrailMeshRef = useRef<(() => void) | null>(null);

  // Camera state refs for smooth transitions (focus / restore)
  const targetCameraPosRef = useRef(new THREE.Vector3(4.8, 13.5, 9.2));
  const targetCameraLookAtRef = useRef(new THREE.Vector3(0, 0.95, 0));
  const currentCameraLookAtRef = useRef(new THREE.Vector3(0, 0.95, 0));
  const isCameraFocusedRef = useRef(false);

  // Textures
  const tapePatternTexRef = useRef<THREE.CanvasTexture | null>(null);
  const rollTapePatternTexRef = useRef<THREE.CanvasTexture | null>(null); // Separate high-fidelity texture for the rolling cylinder
  const tapeBumpTexRef = useRef<THREE.CanvasTexture | null>(null);
  const rollSideTexRef = useRef<THREE.CanvasTexture | null>(null);
  const rollSideBumpTexRef = useRef<THREE.CanvasTexture | null>(null);
  const rollSideRoughnessTexRef = useRef<THREE.CanvasTexture | null>(null);
  const cardboardCoreTexRef = useRef<THREE.CanvasTexture | null>(null);
  const deskTexRef = useRef<THREE.CanvasTexture | null>(null);

  // Track active unrolled length for shrinking roll radius
  const [totalLength, setTotalLength] = useState(0);

  // Configuration Constants
  const DEFAULT_WIDTH = 0.6;
  const INITIAL_RADIUS = 1.0; // 1.0 Outer radius as requested
  const CORE_RADIUS = 0.62; // 0.62 Inner radius as requested (ratio 0.62 : 1.0)
  const SCALE_FACTOR = 1.95; // Scale factor for the physical tape roll model, slightly enlarged as requested
  const TAPE_THICKNESS = 0.016; // 2x physical thickness
  const SLOPE_LIMIT = 0.004; // Double the slope limit for physical bridge consistency with 2x thickness

  // Preload custom images into HTMLImageElement nodes
  useEffect(() => {
    if (config.pattern === 'custom' && config.customImages && config.customImages.length > 0) {
      let loadedCount = 0;
      const images: HTMLImageElement[] = [];
      const urls = config.customImages;

      urls.forEach((url, index) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          images[index] = img;
          loadedCount++;
          if (loadedCount === urls.length) {
            setLoadedCustomImages(images.filter(Boolean));
          }
        };
        img.onerror = () => {
          loadedCount++;
          if (loadedCount === urls.length) {
            setLoadedCustomImages(images.filter(Boolean));
          }
        };
        img.src = url;
      });
    } else {
      setLoadedCustomImages([]);
    }
  }, [config.customImages, config.pattern]);

  // Core texture setup function
  const updateTextures = (currentConfig: TapeConfig, customImgs: HTMLImageElement[]) => {
    // Generate a single shared pattern canvas to ensure 100% synchronization of data, texture, scale, and alignment
    const sharedPatternCanvas = generateTapePattern(currentConfig.pattern, customImgs, currentConfig.tapeColor || '#E61919');

        // 1. Trail Tape Pattern (dispose of old texture to clear WebGL cache completely and immediately update existing trails)
    if (tapePatternTexRef.current) {
      tapePatternTexRef.current.dispose();
    }
    const trailTex = new THREE.CanvasTexture(sharedPatternCanvas);
    trailTex.wrapS = THREE.RepeatWrapping;
    trailTex.wrapT = THREE.ClampToEdgeWrapping;
    trailTex.colorSpace = THREE.SRGBColorSpace;
    trailTex.repeat.set(1, 1); // 1:1 trail mapping, density is controlled dynamically by patternScale inside rebuildTrailMesh
    trailTex.minFilter = THREE.LinearMipmapLinearFilter;
    trailTex.magFilter = THREE.LinearFilter;
    trailTex.anisotropy = 16; // Maximum anisotropic filtering for extreme sharpness at oblique viewing angles
    tapePatternTexRef.current = trailTex;

    // 2. Roll Cylinder Pattern (dispose of old texture for perfect synchronization and instant update)
    if (rollTapePatternTexRef.current) {
      rollTapePatternTexRef.current.dispose();
    }
    const rollTex = new THREE.CanvasTexture(sharedPatternCanvas);
    rollTex.wrapS = THREE.RepeatWrapping;
    rollTex.wrapT = THREE.ClampToEdgeWrapping;
    rollTex.colorSpace = THREE.SRGBColorSpace;
    rollTex.minFilter = THREE.LinearMipmapLinearFilter;
    rollTex.magFilter = THREE.LinearFilter;
    rollTex.anisotropy = 16; // Maximum anisotropic filtering for extreme sharpness at oblique viewing angles
    rollTapePatternTexRef.current = rollTex;

    // 3. Paper Bump Map
    if (!tapeBumpTexRef.current) {
      const bumpCanvas = generateTapeBumpMap();
      const tex = new THREE.CanvasTexture(bumpCanvas);
      tex.wrapS = THREE.RepeatWrapping;
      tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(10, 2);
      tapeBumpTexRef.current = tex;
    }

    // 4. Roll Side Wound Paper Texture
    let baseColor = '#738570'; // Sage Green
    if (currentConfig.pattern === 'terracotta_geo') baseColor = '#C46A52';
    if (currentConfig.pattern === 'indigo_constellation') baseColor = '#1B2232';
    if (currentConfig.pattern === 'pastel_grid') baseColor = '#FAF8F5';
    if (currentConfig.pattern === 'custom') baseColor = '#FAF8F5';

    const sideCanvas = generateRollSideTexture(baseColor);
    if (rollSideTexRef.current) {
      rollSideTexRef.current.dispose();
    }
    const sideTex = new THREE.CanvasTexture(sideCanvas);
    sideTex.minFilter = THREE.LinearMipmapLinearFilter;
    rollSideTexRef.current = sideTex;

    // Roll Side Bump Texture
    const sideBumpCanvas = generateRollSideBumpMap();
    if (rollSideBumpTexRef.current) {
      rollSideBumpTexRef.current.dispose();
    }
    const sideBumpTex = new THREE.CanvasTexture(sideBumpCanvas);
    sideBumpTex.minFilter = THREE.LinearMipmapLinearFilter;
    rollSideBumpTexRef.current = sideBumpTex;

    // Roll Side Roughness Texture
    const sideRoughnessCanvas = generateRollSideRoughnessMap();
    if (rollSideRoughnessTexRef.current) {
      rollSideRoughnessTexRef.current.dispose();
    }
    const sideRoughnessTex = new THREE.CanvasTexture(sideRoughnessCanvas);
    sideRoughnessTex.minFilter = THREE.LinearMipmapLinearFilter;
    rollSideRoughnessTexRef.current = sideRoughnessTex;

    // Cardboard Core Texture
    if (!cardboardCoreTexRef.current) {
      const cbCanvas = generateCardboardCoreTexture();
      const cbTex = new THREE.CanvasTexture(cbCanvas);
      cbTex.wrapS = THREE.RepeatWrapping;
      cbTex.wrapT = THREE.RepeatWrapping;
      cbTex.repeat.set(4, 1);
      cbTex.minFilter = THREE.LinearMipmapLinearFilter;
      cardboardCoreTexRef.current = cbTex;
    }

    // 5. Desk Surface Texture
    const deskCanvas = generateDeskTexture(currentConfig.deskMaterial);
    if (deskTexRef.current) {
      deskTexRef.current.dispose();
    }
    const deskTex = new THREE.CanvasTexture(deskCanvas);
    deskTex.wrapS = THREE.RepeatWrapping;
    deskTex.wrapT = THREE.RepeatWrapping;
    deskTex.repeat.set(4, 4);
    deskTexRef.current = deskTex;
  };

  // Handle Clear Trigger
  useEffect(() => {
    if (clearTrigger > 0) {
      isDragging.current = false; // Stop any active user dragging/interaction instantly
      
      // Smoothly restore the camera back to the original oblique perspective
      isCameraFocusedRef.current = false;
      targetCameraPosRef.current.set(4.8, 13.5, 9.2);
      targetCameraLookAtRef.current.set(0, 0.95, 0);

      // Reset the roll target back to the central origin smoothly
      targetPos.current.set(0, 0, 0);

      // Instantly clear the path points and stats to avoid rendering lags
      pathPoints.current = [];
      statsRef.current = { length: 0, overlaps: 0 };
      onStatsUpdate(0, 0);
      setTotalLength(0);
      lastPathPointRef.current = null;

      // Update the geometry of the trail to be empty immediately!
      if (rebuildTrailMeshRef.current) {
        rebuildTrailMeshRef.current();
      }

      // Also reset the physical position and rotation of the cylinder immediately to origin
      if (rollGroupRef.current) {
        rollGroupRef.current.position.set(0, INITIAL_RADIUS * SCALE_FACTOR, 0);
        rollGroupRef.current.rotation.set(0, 0, 0);
      }
      if (rollInnerMeshRef.current) {
        rollInnerMeshRef.current.rotation.set(0, 0, 0);
      }
    }
  }, [clearTrigger]);

  // Propagate and update textures when config or loaded custom images change
  useEffect(() => {
    updateTextures(config, loadedCustomImages);

    // Update desk material map
    if (deskRef.current && deskTexRef.current) {
      const mat = deskRef.current.material as THREE.MeshStandardMaterial;
      mat.map = deskTexRef.current;
      mat.needsUpdate = true;
    }

    // Update roll side cap textures and roll pattern
    if (rollInnerMeshRef.current && rollSideTexRef.current) {
      rollInnerMeshRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const mat = child.material;
          // Apply side texture to Side Caps (RingGeometry meshes)
          if (child.name === 'sideCapLeft' || child.name === 'sideCapRight') {
            const m = mat as THREE.MeshStandardMaterial;
            m.map = rollSideTexRef.current;
            m.bumpMap = rollSideBumpTexRef.current;
            m.bumpScale = 0.06; // High-frequency fiber/layer grain (reduced for silkiness)
            m.normalScale.set(1.5, 1.5); // Softened normalScale for natural mature fiber weave depth
            m.roughnessMap = rollSideRoughnessTexRef.current;
            m.roughness = 0.95; // Matte rough paper side edge
            m.metalness = 0.0; // Completely matte
            m.color = new THREE.Color('#FFFFFF'); // Clean cool white / light cool grey tone
            m.needsUpdate = true;
            
            // Instantly sync physical offset of side caps
            const isLeft = child.name === 'sideCapLeft';
            child.position.z = (isLeft ? -1 : 1) * config.width * 1.3 / 2;
          }
          // Apply high-fidelity washi pattern to outer tube cylinder
          if (child.name === 'outerTapeTube') {
            const m = mat as THREE.MeshStandardMaterial;
            if (rollTapePatternTexRef.current) {
              m.map = rollTapePatternTexRef.current;
              m.emissive = new THREE.Color('#151515'); // Lower emissive to prevent washing out the pattern saturation
              m.emissiveMap = rollTapePatternTexRef.current;
              m.bumpMap = tapeBumpTexRef.current;
              m.bumpScale = 0.015; // Delicate micro-paper grain normal/bump simulation
              m.normalScale.set(0.2, 0.2); // Weak normalScale for paper micro-grain
              m.roughness = 0.88; // Dry matte paper feel
              m.metalness = 0.0; // No plastic reflection
              m.color = new THREE.Color('#FFFFFF'); // Clean cool white / light cool grey tone
              m.needsUpdate = true;
            }
            // Instantly sync physical scale of outer tube
            child.scale.z = config.width / DEFAULT_WIDTH;
          }
          // Apply dry paperboard pattern to inner cylinder wall
          if (child.name === 'innerCardboardTube') {
            const m = mat as THREE.MeshStandardMaterial;
            if (cardboardCoreTexRef.current) {
              m.map = cardboardCoreTexRef.current;
              m.bumpMap = cardboardCoreTexRef.current;
            }
            m.bumpScale = 0.01;
            m.roughness = 0.9; // industrial unreflective cardboard roughness
            m.metalness = 0.0;
            m.color = new THREE.Color('#FFFFFF'); // Clean cool white / light cool grey tone
            m.needsUpdate = true;
            // Instantly sync physical scale of inner tube
            child.scale.z = config.width / DEFAULT_WIDTH;
          }
        }
      });
    }

    // Update trail mesh material map
    if (trailMeshRef.current && tapePatternTexRef.current) {
      const mat = trailMeshRef.current.material as THREE.MeshStandardMaterial;
      mat.map = tapePatternTexRef.current;
      mat.bumpMap = tapeBumpTexRef.current;
      mat.bumpScale = 0.015;
      mat.normalScale.set(0.2, 0.2);
      mat.roughness = 0.88;
      mat.metalness = 0.0;
      mat.color = new THREE.Color('#FFFFFF'); // Clean cool white / light cool grey tone
      mat.emissive = new THREE.Color('#151515'); // Lower emissive to prevent washing out the pattern saturation
      mat.emissiveMap = tapePatternTexRef.current;
      mat.needsUpdate = true;
    }

    // Immediately trigger trail mesh geometry rebuild to update UV mapping with new scales
    if (rebuildTrailMeshRef.current) {
      rebuildTrailMeshRef.current();
    }
  }, [config.pattern, config.deskMaterial, config.width, loadedCustomImages]);

  // Handle Screenshot Request
  useEffect(() => {
    const handleRequestScreenshot = () => {
      if (canvasRef.current && rendererRef.current && sceneRef.current && cameraRef.current) {
        // Render current state to ensure perfect capture
        rendererRef.current.render(sceneRef.current, cameraRef.current);
        const dataUrl = canvasRef.current.toDataURL('image/png');
        window.dispatchEvent(new CustomEvent('screenshot-captured', { detail: { dataUrl } }));
      }
    };
    window.addEventListener('request-screenshot', handleRequestScreenshot);
    return () => {
      window.removeEventListener('request-screenshot', handleRequestScreenshot);
    };
  }, []);

  // Main Three.js Initialization
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.deskColor); // Elegant ivory minimalist bg
    scene.fog = new THREE.FogExp2(COLORS.deskColor, 0.035);
    sceneRef.current = scene;

    // 2. Camera (Overhead oblique architectural perspective zoomed for precise volume and balanced industrial scale)
    const camera = new THREE.PerspectiveCamera(28, width / height, 0.1, 100);
    camera.position.copy(targetCameraPosRef.current);
    camera.lookAt(currentCameraLookAtRef.current); // Focus slightly above the origin to shift the tape roll down to the vertical center of the screen
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3.0));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // Initialize textures for starting config
    updateTextures(configRef.current, []);

    // 4. Lights (Warm, balanced ambient lighting to ensure soft shadows that are never pitch black)
    const ambientLight = new THREE.AmbientLight('#FAF6EE', 1.4); // extremely bright and warm ambient base
    scene.add(ambientLight);

    // Strong primary key light to produce crisp shadows and bright specular highlights
    const keyLight = new THREE.DirectionalLight('#FFFFFF', 1.2); // Softened from 2.2 to prevent harsh high-contrast black shadows
    keyLight.position.set(5.5, 9.5, 4.5);
    keyLight.castShadow = true;
    
    // Tighten the shadow camera bounds to maximize resolution for the tape roll area
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 22;
    keyLight.shadow.camera.left = -6;
    keyLight.shadow.camera.right = 6;
    keyLight.shadow.camera.top = 6;
    keyLight.shadow.camera.bottom = -6;
    keyLight.shadow.bias = -0.0004;
    keyLight.shadow.radius = 1; // highly sharp, realistic edge profile
    scene.add(keyLight);

    // Back-left rim light to separate the 3D roll from the background and define edges
    const rimLight = new THREE.DirectionalLight('#FFFFFF', 0.8);
    rimLight.position.set(-7, 6, -5);
    scene.add(rimLight);

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

    // Beautiful 3D Perspective Grid for clean, tech-forward structural alignment
    const gridHelper = new THREE.GridHelper(50, 100, '#C5C5C5', '#DEDEDE');
    gridHelper.position.y = 0.002; // slightly above table
    const gridMat = gridHelper.material as THREE.LineBasicMaterial;
    gridMat.opacity = 0.32;
    gridMat.transparent = true;
    gridMat.depthWrite = false;
    scene.add(gridHelper);

    // 6. Build the hollow 3D Tape Roll Assembly
    const rollGroup = new THREE.Group();
    rollGroup.scale.set(SCALE_FACTOR, SCALE_FACTOR, SCALE_FACTOR);
    rollGroup.position.set(0, INITIAL_RADIUS * SCALE_FACTOR, 0); // Strictly centered at (0, radius * SCALE_FACTOR, 0)
    scene.add(rollGroup);
    rollGroupRef.current = rollGroup;

    // The inner assembly that rotates as the roll travels
    const rollInnerMesh = new THREE.Group();
    rollGroup.add(rollInnerMesh);
    rollInnerMeshRef.current = rollInnerMesh;

    // Build the cylinder components (Hollow architecture with ring caps and cardboard core)
    const rollWidth = DEFAULT_WIDTH * 1.3; // 1.3x width base geometry scale

    // Custom Washi Tape Material - optimized for high quality matte paper texture
    const outerTapeMat = new THREE.MeshStandardMaterial({
      map: rollTapePatternTexRef.current || tapePatternTexRef.current,
      bumpMap: tapeBumpTexRef.current,
      bumpScale: 0.015, // Delicate micro-paper grain normal/bump simulation
      roughness: 0.9, // High-roughness matte paper as requested
      metalness: 0.0, // Completely non-reflective
      color: new THREE.Color('#FFFFFF'), // Clean cool white / light cool grey tone
      side: THREE.DoubleSide,
      emissive: new THREE.Color('#151515'), // Lower emissive to keep patterns highly vibrant and saturated
      emissiveMap: rollTapePatternTexRef.current || tapePatternTexRef.current,
    });
    outerTapeMat.normalScale.set(0.2, 0.2); // Set weak normalScale for paper micro-grain
    outerTapeMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        /float\s+dotNL\s*=\s*saturate\s*\(\s*dot\s*\(\s*(geometry\.normal|geometryNormal)\s*,\s*directLight\.direction\s*\)\s*\)\s*;/g,
        'float dotNL = smoothstep( -0.35, 1.0, dot( $1, directLight.direction ) ) * 0.8 + 0.2;'
      );
    };

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
    outerTapeTube.receiveShadow = false; // Disable to completely prevent self-shadowing acne/artifacts on the roll
    rollInnerMesh.add(outerTapeTube);

    // Inner Cardboard Core Tube - unreflective matte grey-white paperboard inside wall
    const cardboardMat = new THREE.MeshStandardMaterial({
      map: cardboardCoreTexRef.current || null,
      bumpMap: cardboardCoreTexRef.current || null,
      bumpScale: 0.01,
      roughness: 0.9, // industrial cardboard roughness
      metalness: 0.0,
      color: new THREE.Color('#FFFFFF'), // Clean cool white / light cool grey tone
      side: THREE.DoubleSide,
    });
    const innerTubeGeo = new THREE.CylinderGeometry(
      CORE_RADIUS,
      CORE_RADIUS,
      rollWidth,
      64,
      1,
      true // open ended
    );
    innerTubeGeo.rotateX(Math.PI / 2);
    const innerCardboardTube = new THREE.Mesh(innerTubeGeo, cardboardMat);
    innerCardboardTube.name = 'innerCardboardTube';
    innerCardboardTube.castShadow = true;
    innerCardboardTube.receiveShadow = false; // Disable to prevent dark core shadow overlap artifacts
    rollInnerMesh.add(innerCardboardTube);

    // Side Rings Caps - realistic concentric layers with bump & roughness variance
    const sideCapMat = new THREE.MeshStandardMaterial({
      map: rollSideTexRef.current,
      bumpMap: rollSideBumpTexRef.current || null,
      bumpScale: 0.06, // High-frequency fiber/layer grain (reduced for silkiness)
      roughnessMap: rollSideRoughnessTexRef.current || null,
      roughness: 0.95, // Matte rough paper side edge
      metalness: 0.0, // Completely matte
      color: new THREE.Color('#FFFFFF'), // Clean cool white / light cool grey tone
      side: THREE.DoubleSide,
      emissive: new THREE.Color('#666666'), // Keep the roll sides luminous
      emissiveMap: rollSideTexRef.current || null,
    });
    sideCapMat.normalScale.set(1.5, 1.5); // Gently boost normalScale for soft realistic fiber depth

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
      bumpScale: 0.015,
      roughness: 0.9, // High-roughness matte paper as requested
      metalness: 0.0, // Completely non-reflective
      color: new THREE.Color('#FFFFFF'), // Clean cool white / light cool grey tone
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 1.0,
      emissive: new THREE.Color('#151515'), // Lower emissive to keep patterns highly vibrant and saturated
      emissiveMap: tapePatternTexRef.current,
    });
    trailMat.normalScale.set(0.2, 0.2); // Set weak normalScale for paper micro-grain
    trailMat.onBeforeCompile = (shader) => {
      shader.fragmentShader = shader.fragmentShader.replace(
        /float\s+dotNL\s*=\s*saturate\s*\(\s*dot\s*\(\s*(geometry\.normal|geometryNormal)\s*,\s*directLight\.direction\s*\)\s*\)\s*;/g,
        'float dotNL = smoothstep( -0.35, 1.0, dot( $1, directLight.direction ) ) * 0.8 + 0.2;'
      );
    };
        const trailGeo = new THREE.BufferGeometry();
    const trailMesh = new THREE.Mesh(trailGeo, trailMat);
    trailMesh.castShadow = true;
    trailMesh.receiveShadow = false; // Disabled to 100% eliminate dark grey blocky self-shadowing artifacts on overlapping folds/wrinkles
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
      if (e.button === 0) { // Left-click
        isDragging.current = true;
        updateTargetPositionFromMouse(e.clientX, e.clientY);
      }
    };

    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault(); // Prevent standard browser right-click menu

      if (isCameraFocusedRef.current) {
        // If already focused, right-click anywhere restores the normal view
        targetCameraPosRef.current.set(4.8, 13.5, 9.2);
        targetCameraLookAtRef.current.set(0, 0.95, 0);
        isCameraFocusedRef.current = false;
        return;
      }

      if (!containerRef.current || !cameraRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const clickX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const clickY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(new THREE.Vector2(clickX, clickY), cameraRef.current);
      const intersects = raycaster.intersectObject(rayPlane);
      if (intersects.length > 0) {
        const hitPoint = intersects[0].point;
        let minDistance = Infinity;
        let closestPoint = new THREE.Vector3();

        if (rollGroupRef.current) {
          const rollPos = rollGroupRef.current.position;
          const dRoll = Math.sqrt(Math.pow(hitPoint.x - rollPos.x, 2) + Math.pow(hitPoint.z - rollPos.z, 2));
          if (dRoll < minDistance) {
            minDistance = dRoll;
            closestPoint.copy(rollPos);
          }
        }

        for (const pt of pathPoints.current) {
          const dPt = Math.sqrt(Math.pow(hitPoint.x - pt.x, 2) + Math.pow(hitPoint.z - pt.z, 2));
          if (dPt < minDistance) {
            minDistance = dPt;
            closestPoint.set(pt.x, pt.y, pt.z);
          }
        }

        // Focus camera closer to the closest pattern/roll point if clicked within 1.5 units
        if (minDistance < 1.5) {
          // Align the zoom focus along the exact same oblique direction as the main view
          // to completely avoid lookAt singularities, camera twisting, or perspective distortion.
          // Zoom to a comfortable distance of 4.2 units so the pattern is perfectly centered, visible, and distortion-free!
          const obliqueDir = new THREE.Vector3(4.8, 12.55, 9.2).normalize();
          const relativeOffset = obliqueDir.multiplyScalar(4.2);
          targetCameraPosRef.current.copy(closestPoint).add(relativeOffset);
          targetCameraLookAtRef.current.copy(closestPoint);
          isCameraFocusedRef.current = true;
        }
      }
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
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        updateTargetPositionFromMouse(touchX, touchY);
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
    containerEl.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    containerEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);

    // --- REBUILD TAPE TRAIL GEOMETRY ---
    const rebuildTrailMesh = () => {
      const pts = [...pathPoints.current];

      // If the roll is currently unrolling, dynamically append the current roll's touch-down point
      // to the points array. This ensures a 100% gapless transition on every frame!
      if (rollGroupRef.current && lastPathPointRef.current) {
        const rollPos = rollGroupRef.current.position;
        let ridingHeight = 0.0;
        if (pathPoints.current.length > 0) {
          ridingHeight = pathPoints.current[pathPoints.current.length - 1].y;
        }
        const bottomY = ridingHeight;
        const bottomPos = new THREE.Vector3(rollPos.x, bottomY, rollPos.z);
        const lastPt = pts[pts.length - 1];

        const dist = lastPt ? Math.sqrt(
          Math.pow(bottomPos.x - lastPt.x, 2) +
          Math.pow(bottomPos.z - lastPt.z, 2)
        ) : 0;

        if (dist > 0.001) {
          const perpDir = new THREE.Vector3(0, 0, 1).applyQuaternion(rollGroupRef.current.quaternion).normalize();

          // Parallel transport: align normal vector with the previous point to prevent sudden twists or flips
          if (lastPt) {
            const dot = perpDir.x * lastPt.nx + perpDir.z * lastPt.nz;
            if (dot < 0) {
              perpDir.negate();
            }
          }

          pts.push({
            x: bottomPos.x,
            y: bottomPos.y,
            z: bottomPos.z,
            nx: perpDir.x,
            nz: perpDir.z,
            distance: (lastPt ? lastPt.distance : 0) + dist,
          });
        }
      }

      if (pts.length < 2) {
        if (trailMeshRef.current) {
          const oldGeom = trailMeshRef.current.geometry;
          const geom = new THREE.BufferGeometry();
          geom.setAttribute('position', new THREE.Float32BufferAttribute([], 3));
          geom.setAttribute('uv', new THREE.Float32BufferAttribute([], 2));
          trailMeshRef.current.geometry = geom;
          oldGeom.dispose();
        }
        return;
      }

      const positions: number[] = [];
      const uvs: number[] = [];
      const indices: number[] = [];
      const width = configRef.current.width * 1.3; // 1.3x width scale

      const cellPitch = width; // Perfect 1:1 cell aspect ratio matching the 1024x128 texture slots
      const patternScale = cellPitch * 4; // 4 slots in the texture

      // Apply a Gaussian-weighted running average to path points and normals to make corners and turns ultra-smooth and eliminate hard folds
      const smoothedPts = pts.map((pt, idx) => {
        if (idx < 2 || idx > pts.length - 3) {
          return { ...pt }; // Keep the start and active drawing tip completely anchored and precise
        }
        let sumX = 0, sumY = 0, sumZ = 0;
        let sumNx = 0, sumNz = 0;
        let totalWeight = 0;

        const windowSize = 3; // Window of 7 points
        for (let offset = -windowSize; offset <= windowSize; offset++) {
          const neighborIdx = idx + offset;
          if (neighborIdx >= 0 && neighborIdx < pts.length) {
            const dist = Math.abs(offset);
            const weight = Math.exp(-dist * dist / 4.5); // Gaussian bell curve weights
            sumX += pts[neighborIdx].x * weight;
            sumY += pts[neighborIdx].y * weight;
            sumZ += pts[neighborIdx].z * weight;
            sumNx += pts[neighborIdx].nx * weight;
            sumNz += pts[neighborIdx].nz * weight;
            totalWeight += weight;
          }
        }

        const rawNx = sumNx / totalWeight;
        const rawNz = sumNz / totalWeight;
        const len = Math.sqrt(rawNx * rawNx + rawNz * rawNz);
        const normNx = len > 0.0001 ? rawNx / len : rawNx;
        const normNz = len > 0.0001 ? rawNz / len : rawNz;

        return {
          ...pt,
          x: sumX / totalWeight,
          y: sumY / totalWeight,
          z: sumZ / totalWeight,
          nx: normNx,
          nz: normNz,
        };
      });

      for (let i = 0; i < smoothedPts.length; i++) {
        const pt = smoothedPts[i];

        // Normal offsets on XZ plane perpendicular to movement vector
        const ox = pt.nx * (width / 2);
        const oz = pt.nz * (width / 2);

        // Compute left and right vertices with bridges/stacking height
        const vlX = pt.x + ox;
        const vlY = pt.y;
        const vlZ = pt.z + oz;

        const vrX = pt.x - ox;
        const vrY = pt.y;
        const vrZ = pt.z - oz;

        positions.push(vlX, vlY, vlZ);
        positions.push(vrX, vrY, vrZ);

        // --- MATHEMATICALLY CONTINUOUS UNDISTORTED UV MAPPING ---
        // U is strictly proportional to cumulative length along the path (100% stable, no jumping cell reference planes)
        // V goes from 1.0 (Left edge) to 0.0 (Right edge)
        const u = pt.distance / patternScale;

        uvs.push(u, 1.0); // Left vertex
        uvs.push(u, 0.0); // Right vertex

        // Build continuous quad triangles between consecutive pairs of points
        if (i < pts.length - 1) {
          const a = i * 2;
          const b = i * 2 + 1;
          const c = (i + 1) * 2;
          const d = (i + 1) * 2 + 1;

          // Triangle 1: a -> b -> c
          indices.push(a, b, c);
          // Triangle 2: b -> d -> c
          indices.push(b, d, c);
        }
      }

      if (trailMeshRef.current) {
        const oldGeom = trailMeshRef.current.geometry;
        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
        geom.setIndex(indices);
        geom.computeVertexNormals();
        trailMeshRef.current.geometry = geom;
        oldGeom.dispose();
      }
    };

    rebuildTrailMeshRef.current = rebuildTrailMesh;

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
      const easing = 0.45; // Increased responsiveness / snappier movement sensitivity as requested

      // Keep the tape roll radius constant at its initial size during the rolling process
      const currentRadius = INITIAL_RADIUS * SCALE_FACTOR;

      // Update 3D roll geometry dimensions and scales to dynamically match config.width on every frame
      const shrinkScale = currentRadius / (INITIAL_RADIUS * SCALE_FACTOR);
      outerTapeTube.scale.set(shrinkScale, shrinkScale, 1);
      sideCapLeft.scale.set(shrinkScale, shrinkScale, 1);
      sideCapRight.scale.set(shrinkScale, shrinkScale, 1);
      
      sideCapLeft.position.z = -currentConfig.width * 1.3 / 2;
      sideCapRight.position.z = currentConfig.width * 1.3 / 2;
      outerTapeTube.scale.z = currentConfig.width / DEFAULT_WIDTH;
      innerCardboardTube.scale.set(shrinkScale, shrinkScale, 1);
      innerCardboardTube.scale.z = currentConfig.width / DEFAULT_WIDTH;

      // Adjust cylinder texture wrapping dynamically to keep the pattern size visually synchronized with the trail on every frame
      if (rollTapePatternTexRef.current) {
        const circ = 2 * Math.PI * currentRadius;
        const width = currentConfig.width * 1.3;
        const cellPitch = width; // Matching rebuildTrailMesh exactly
        const patternScale = cellPitch * 4; // Matching rebuildTrailMesh exactly (4 slots)
        rollTapePatternTexRef.current.repeat.set(circ / patternScale, 1.0);

        // Align the texture offset so that the bottom touch point of the cylinder perfectly matches the unrolled trail pattern
        const theta = rollInnerMesh.rotation.z;
        const unrolledLength = statsRef.current.length;
        const offset = (unrolledLength + currentRadius * (theta - Math.PI / 2)) / patternScale;
        rollTapePatternTexRef.current.offset.x = offset;
      }

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

        // 4. Update Path Trail Point
        if (!lastPathPointRef.current) {
          lastPathPointRef.current = new THREE.Vector3().copy(rollGroup.position);
          lastPathPointRef.current.y = 0.002; // Flat on table base
        }

        const distSinceLast = Math.sqrt(
          Math.pow(rollGroup.position.x - lastPathPointRef.current.x, 2) +
          Math.pow(rollGroup.position.z - lastPathPointRef.current.z, 2)
        );
        const recordingThreshold = 0.08; // Point density threshold for perfect smooth curves

        if (distSinceLast > recordingThreshold) {
          // Bottom touch point of the roll on the desk
          const bottomPos = new THREE.Vector3(rollGroup.position.x, 0, rollGroup.position.z);
          
          // Calculate vector perpendicular to path (XZ plane)
          // The perpendicular vector is the local Z axis of the rollGroup in world space!
          // Since the rollGroup is rotated by Y, its local Z unit vector in world space can be retrieved:
          const perpDir = new THREE.Vector3(0, 0, 1).applyQuaternion(rollGroup.quaternion).normalize();

          // Parallel transport: align normal vector with previous point to prevent sudden twists or flips
          if (pathPoints.current.length > 0) {
            const prevPt = pathPoints.current[pathPoints.current.length - 1];
            const dot = perpDir.x * prevPt.nx + perpDir.z * prevPt.nz;
            if (dot < 0) {
              perpDir.negate();
            }
          }

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

          // Track last recorded position
          lastPathPointRef.current.copy(rollGroup.position);
          lastPathPointRef.current.y = targetHeight;
        }
      }

      prevRollPos.copy(rollGroup.position);

      // Rebuild the dynamic trail ribbon on every frame to ensure the transition is 100% gapless and smooth
      rebuildTrailMesh();

      // Smoothly interpolate camera position and lookAt target for cinematic focus/restore effects
      camera.position.lerp(targetCameraPosRef.current, 0.08);
      currentCameraLookAtRef.current.lerp(targetCameraLookAtRef.current, 0.08);
      camera.lookAt(currentCameraLookAtRef.current);

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(tick);
    };

    tick();

    // Cleanup
    return () => {
      rebuildTrailMeshRef.current = null;
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (containerEl) {
        containerEl.removeEventListener('mousedown', onMouseDown);
        containerEl.removeEventListener('contextmenu', onContextMenu);
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
      rollTapePatternTexRef.current?.dispose();
      tapeBumpTexRef.current?.dispose();
      rollSideTexRef.current?.dispose();
      rollSideBumpTexRef.current?.dispose();
      rollSideRoughnessTexRef.current?.dispose();
      cardboardCoreTexRef.current?.dispose();
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
