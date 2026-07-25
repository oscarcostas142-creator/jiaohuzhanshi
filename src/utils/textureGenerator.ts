import { TapePattern, DeskMaterial, COLORS } from '../types';

/**
 * Boosts the saturation of an RGB color by converting to HSL,
 * increasing the S channel, and converting back to RGB.
 */
function boostColorSaturation(r: number, g: number, b: number): { r: number; g: number; b: number } {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case rNorm: h = (gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0); break;
      case gNorm: h = (bNorm - rNorm) / d + 2; break;
      case bNorm: h = (rNorm - gNorm) / d + 4; break;
    }
    h /= 6;
  }

  // Boost saturation component by 25% for extra vibrancy, capped at 1.0
  s = Math.min(1.0, s * 1.25);
  // Keep the lightness slightly deeper/richer
  const adjustedL = Math.max(0.1, Math.min(0.9, l * 0.96));

  let rRes = adjustedL, gRes = adjustedL, bRes = adjustedL;
  if (s !== 0) {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };

    const q = adjustedL < 0.5 ? adjustedL * (1 + s) : adjustedL + s - adjustedL * s;
    const p = 2 * adjustedL - q;
    rRes = hue2rgb(p, q, h + 1/3);
    gRes = hue2rgb(p, q, h);
    bRes = hue2rgb(p, q, h - 1/3);
  }

  return {
    r: Math.round(rRes * 255),
    g: Math.round(gRes * 255),
    b: Math.round(bRes * 255)
  };
}

/**
 * Processes an input image to create a high-fidelity 1-to-1 red stamp.
 * 1. Filters out white background to transparent (with high brightness tolerance).
 * 2. Recolors the non-transparent pixels to gorgeous vermilion stamp red.
 * 3. Applies a noise map to create organic, pressure-uneven dry spots (露白/斑驳) and fuzzy bleed edges (毛刺).
 */
function preprocessStampImage(
  img: HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
  stampColor: string = '#E61919'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Use high-quality image scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fit the image in the target box with padding while strictly preserving 1:1 original aspect ratio
  const imgW = img.width || 64;
  const imgH = img.height || 64;
  const maxDim = Math.min(targetWidth, targetHeight) * 0.85; // Elegant padding for clear visibility
  const scale = Math.min(maxDim / imgW, maxDim / imgH);
  const w = imgW * scale;
  const h = imgH * scale;
  const x = (targetWidth - w) / 2;
  const y = (targetHeight - h) / 2;

  // Draw onto offscreen canvas
  ctx.drawImage(img, x, y, w, h);

  // Read pixels for high-quality stamp simulation
  let imgData;
  try {
    imgData = ctx.getImageData(0, 0, targetWidth, targetHeight);
  } catch (e) {
    // Cross-origin fallback
    return canvas;
  }
  const data = imgData.data;

  // Hex to RGB conversion
  let rStamp = 200, gStamp = 60, bStamp = 60;
  if (stampColor.startsWith('#')) {
    const hex = stampColor.substring(1);
    if (hex.length === 6) {
      rStamp = parseInt(hex.substring(0, 2), 16);
      gStamp = parseInt(hex.substring(2, 4), 16);
      bStamp = parseInt(hex.substring(4, 6), 16);
    } else if (hex.length === 3) {
      rStamp = parseInt(hex[0] + hex[0], 16);
      gStamp = parseInt(hex[1] + hex[1], 16);
      bStamp = parseInt(hex[2] + hex[2], 16);
    }
  }

  // Boost color saturation and depth mathematically to make the pattern incredibly vibrant
  const boosted = boostColorSaturation(rStamp, gStamp, bStamp);

  const newData = new Uint8ClampedArray(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const a = data[i + 3];

    // Compute luminance
    const brightness = (r * 0.299 + g * 0.587 + b * 0.114);

    // If it's a white or light background pixel, make it completely transparent
    if (brightness > 240 || a < 10) {
      newData[i] = 0;
      newData[i + 1] = 0;
      newData[i + 2] = 0;
      newData[i + 3] = 0;
    } else {
      // It's an ink pixel! Calculate the ink density based on darkness.
      const inkDensity = (240 - brightness) / 240.0;
      // Boost the opacity slightly from 3.2 to 4.2 to render more solid, vivid ink
      const alphaFactor = (a / 255.0) * Math.min(1.0, inkDensity * 4.2);

      // Keep it crisp and beautifully anti-aliased without any destructive random noise or fuzzy erosion
      newData[i] = boosted.r;
      newData[i + 1] = boosted.g;
      newData[i + 2] = boosted.b;
      newData[i + 3] = Math.round(alphaFactor * 255);
    }
  }

  const newImgData = new ImageData(newData, targetWidth, targetHeight);
  ctx.putImageData(newImgData, 0, 0);

  return canvas;
}

/**
 * Procedurally generates an HTMLCanvasElement with the requested Washi tape pattern.
 * Supports custom uploaded images which are rendered in a repeating elegant stamp layout.
 */
/**
 * Procedurally generates an HTMLCanvasElement with the requested Washi tape pattern.
 * Supports custom uploaded images which are rendered in a repeating elegant stamp layout.
 */
export function generateTapePattern(
  pattern: TapePattern,
  customImages?: HTMLImageElement[],
  tapeColor: string = '#E61919'
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  // Highly increased to 8192px x 2048px for crystal-clear pattern rendering!
  canvas.width = 8192;
  canvas.height = 2048;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Use highest-quality image scaling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Clean, cold-white washi paper base background (冷白纸张质感)
  ctx.fillStyle = '#FAF9F6'; // Beautiful off-white / light neutral cold paper
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Very subtle fine side deckle edge texture lines
  ctx.strokeStyle = '#ECE9E2';
  ctx.lineWidth = 16; // Scaled for high resolution
  ctx.beginPath();
  ctx.moveTo(0, 32);
  ctx.lineTo(canvas.width, 32);
  ctx.moveTo(0, canvas.height - 32);
  ctx.lineTo(canvas.width, canvas.height - 32);
  ctx.stroke();

  // If custom images are provided, draw them sequentially in a horizontal linear looping layout (4 slots)
  if (customImages && customImages.length > 0) {
    const numSlots = 4;
    const slotWidth = 8192 / numSlots; // exactly 2048px wide per slot, making each slot a perfect 1:1 square!

    for (let i = 0; i < numSlots; i++) {
      const cx = i * slotWidth + slotWidth / 2;
      const cy = 1024;

      // Select image in loop (img1 -> img2 -> img3 -> img4)
      const img = customImages[i % customImages.length];

      // Preprocess image to have absolute white-removed stamp-ink quality
      const stampCanvas = preprocessStampImage(img, 2048, 2048, tapeColor);

      // Draw onto tape pattern canvas
      ctx.drawImage(stampCanvas, cx - 1024, cy - 1024);
    }
  } else {
    // Elegant procedural fallback while preloading or if no images
    const numSlots = 4;
    const slotWidth = 8192 / numSlots;
    for (let i = 0; i < numSlots; i++) {
      const cx = i * slotWidth + slotWidth / 2;
      const cy = 1024;
      ctx.save();
      ctx.strokeStyle = tapeColor;
      ctx.lineWidth = 64; // Scaled up to match 2048px resolution
      if (i % 2 === 0) {
        // Draw elegant traditional square stamp frame
        ctx.strokeRect(cx - 480, cy - 480, 960, 960);
        ctx.fillStyle = tapeColor;
        ctx.font = 'bold 320px serif'; // Scaled up to match 1024px resolution (now 2048px)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('和纸', cx, cy);
      } else {
        // Draw elegant traditional circular stamp frame
        ctx.beginPath();
        ctx.arc(cx, cy, 512, 0, Math.PI * 2);
        ctx.stroke();
        ctx.fillStyle = tapeColor;
        ctx.font = 'bold 320px serif'; // Scaled up to match 1024px resolution (now 2048px)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('印章', cx, cy);
      }
      ctx.restore();
    }
  }

  return canvas;
}

/**
 * Procedurally generates a grayscale bump map canvas representing fiber and paper noise.
 * This is crucial to give the paper tape a beautiful matte tactile fiber/roughness.
 */
export function generateTapeBumpMap(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Medium gray base (neutral displacement)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Add high frequency paper grain noise
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 15; // Subtle grain
    data[i] = Math.max(0, Math.min(255, 128 + noise));     // R
    data[i + 1] = Math.max(0, Math.min(255, 128 + noise)); // G
    data[i + 2] = Math.max(0, Math.min(255, 128 + noise)); // B
  }
  ctx.putImageData(imgData, 0, 0);

  // Draw thin, wavy "paper fibers" in gray/white with low opacity
  ctx.lineWidth = 1;
  for (let i = 0; i < 150; i++) {
    const startX = Math.random() * canvas.width;
    const startY = Math.random() * canvas.height;
    const len = Math.random() * 15 + 5;
    const angle = Math.random() * Math.PI * 2;
    const endX = startX + Math.cos(angle) * len;
    const endY = startY + Math.sin(angle) * len;

    // Alternating dark and light fibers to create height changes
    const isLight = Math.random() > 0.5;
    ctx.strokeStyle = isLight ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)';

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    // Slight curve in the fiber
    ctx.quadraticCurveTo(
      startX + Math.cos(angle + 0.3) * (len / 2),
      startY + Math.sin(angle + 0.3) * (len / 2),
      endX,
      endY
    );
    ctx.stroke();
  }

  return canvas;
}

/**
 * Generates the wound spiral paper layers texture for the sides of the tape roll.
 * This simulates the tightly wound concentric rings of paper layers.
 */
export function generateRollSideTexture(baseColor: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Background is cool grey-white cardboard/paper core
  ctx.fillStyle = '#EBECEF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw the wound paper tape layers (radii 76px to 256px)
  // Fill the outer ring with a color close to the tape's base pattern color
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 256, 0, Math.PI * 2);
  ctx.arc(cx, cy, 76, 0, Math.PI * 2, true); // Hole cut
  ctx.fill();

  // Draw closely spaced concentric circles representing individual layers
  ctx.lineWidth = 2.4; // Thicker lines for more pronounced layers!
  for (let r = 76; r <= 256; r += 3.2) { // 3.2px spacing instead of 1.8px spacing makes layers look much thicker!
    // Add minor variation in color to simulate layers of wound tape and shadows
    const opacity = 0.18 + Math.sin(r * 2.5) * 0.08 + Math.random() * 0.04;
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Occasional light layer edge to simulate highlights on paper edges and physical depth
    if (Math.random() > 0.6) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.9})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 0.8, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Add subtle radial cutting/slicing textures (matte blade marks on the side roll)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.lineWidth = 1;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 180) {
    if (Math.random() > 0.4) {
      const startR = 76 + Math.random() * 20;
      const endR = 256 - Math.random() * 10;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * startR, cy + Math.sin(angle) * startR);
      ctx.lineTo(cx + Math.cos(angle) * endR, cy + Math.sin(angle) * endR);
      ctx.stroke();
    }
  }

  return canvas;
}

/**
 * Beautiful desk textures procedurally based on user choice.
 */
export function generateDeskTexture(material: DeskMaterial): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  switch (material) {
    case 'light_wood': {
      // Base light warm wood tone
      ctx.fillStyle = '#E6D0BA';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create vertical/diagonal wood grain lines
      ctx.strokeStyle = '#D1B59C';
      ctx.lineWidth = 1.5;

      for (let i = -200; i < canvas.width + 200; i += 25) {
        ctx.beginPath();
        ctx.moveTo(i, 0);

        // Make wavy, organic wood curves using bezier/quadratic segments
        let curX = i;
        ctx.moveTo(curX, 0);
        
        for (let y = 100; y <= canvas.height; y += 100) {
          // Math.sin or noise to create wood knot/wave patterns
          const knotWave = Math.sin((y / 200) * Math.PI) * 18;
          const grainCurve = Math.cos((curX / 300) * Math.PI) * 12;
          const nextX = i + knotWave + grainCurve;
          ctx.quadraticCurveTo(curX, y - 50, nextX, y);
          curX = nextX;
        }
        ctx.strokeStyle = `rgba(186, 154, 126, ${0.25 + Math.random() * 0.15})`;
        ctx.stroke();
      }

      // Add a few subtle dark wood lines
      ctx.strokeStyle = 'rgba(135, 105, 80, 0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 15; i++) {
        const x = Math.random() * canvas.width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        let curX = x;
        for (let y = 100; y <= canvas.height; y += 100) {
          const nextX = curX + Math.sin(y / 150) * 8 + (Math.random() - 0.5) * 2;
          ctx.lineTo(nextX, y);
          curX = nextX;
        }
        ctx.stroke();
      }

      // Draw subtle planks boundaries
      ctx.strokeStyle = 'rgba(110, 85, 65, 0.08)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      for (let x = 256; x < canvas.width; x += 256) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      ctx.stroke();
      break;
    }

    case 'studio_slate': {
      // Minimalist dark stone/slate workspace
      ctx.fillStyle = '#1B1D20';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fine sponge/granite noise
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      for (let i = 0; i < data.length; i += 4) {
        const noise = (Math.random() - 0.5) * 12;
        data[i] = Math.max(0, Math.min(255, 27 + noise));     // R
        data[i + 1] = Math.max(0, Math.min(255, 29 + noise)); // G
        data[i + 2] = Math.max(0, Math.min(255, 32 + noise)); // B
      }
      ctx.putImageData(imgData, 0, 0);

      // Add subtle light stone veins
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 4; i++) {
        let x = Math.random() * canvas.width;
        let y = 0;
        ctx.beginPath();
        ctx.moveTo(x, y);
        while (y < canvas.height) {
          x += (Math.random() - 0.5) * 15;
          y += Math.random() * 20 + 5;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      break;
    }

    case 'cream_matte': {
      // Clean sleek industrial matte gray paperboard feel
      ctx.fillStyle = '#EAEAEA';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add fine speckles/cardboard fiber spots for authentic texture depth
      ctx.fillStyle = 'rgba(120, 120, 120, 0.12)';
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = Math.random() * 1.3 + 0.3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'warm_sand': {
      // Terracotta clay/warm desert sand desk
      ctx.fillStyle = '#DECDBE';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fine sand dust
      ctx.fillStyle = 'rgba(158, 128, 108, 0.12)';
      for (let i = 0; i < 5000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = Math.random() * 1.2 + 0.3;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add soft white limestone mineral specs
      ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
      for (let i = 0; i < 1500; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = Math.random() * 1.8 + 0.4;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }

  return canvas;
}

/**
 * Generates a high-frequency procedural bump/displacement map for the side of the tape.
 * Simulates micro-height differences between wound tape layers, paper fibers, and blade cut marks.
 */
export function generateRollSideBumpMap(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Medium gray base represents neutral surface height (128/255)
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Concentric spiral wound layers
  for (let r = 76; r <= 256; r += 3.2) {
    // Alternate dark and light concentric ridges to simulate wound tape physical depth
    const heightVar = Math.sin(r * 2.5) * 45 + (Math.random() - 0.5) * 20;
    const colorVal = Math.min(255, Math.max(0, 128 + Math.round(heightVar)));
    ctx.strokeStyle = `rgb(${colorVal}, ${colorVal}, ${colorVal})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Radial slice/blade cut micro-indentations (dark cuts)
  ctx.strokeStyle = '#4A4A4A';
  ctx.lineWidth = 1;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 150) {
    if (Math.random() > 0.3) {
      const startR = 76 + Math.random() * 15;
      const endR = 256 - Math.random() * 5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * startR, cy + Math.sin(angle) * startR);
      ctx.lineTo(cx + Math.cos(angle) * endR, cy + Math.sin(angle) * endR);
      ctx.stroke();
    }
  }

  // Draw high-frequency micro-fiber noise for authentic paper/felt feel on the side
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const px = (i / 4) % canvas.width;
    const py = Math.floor((i / 4) / canvas.width);
    const dx = px - cx;
    const dy = py - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= 256) {
      // Add fine grain/paper texture noise
      const noise = (Math.random() - 0.5) * 24;
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
      data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
    }
  }
  ctx.putImageData(imgData, 0, 0);

  return canvas;
}

/**
 * Generates a procedural roughness map for the side of the tape.
 * Concentric layers and fiber cuts scatter light differently to avoid flat glossy reflection.
 */
export function generateRollSideRoughnessMap(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const cx = canvas.width / 2;
  const cy = canvas.height / 2;

  // Base roughness is high (rough, matte cardboard) -> ~0.8 roughness (#CCCCCC)
  ctx.fillStyle = '#CCCCCC';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Inner cardboard core (dist < 76) is super rough and matte (0.95 roughness -> #FAF0E0)
  ctx.fillStyle = '#E5E5E5';
  ctx.beginPath();
  ctx.arc(cx, cy, 76, 0, Math.PI * 2);
  ctx.fill();

  // Tape wound layers have varying semi-gloss/matte boundaries
  for (let r = 76; r <= 256; r += 3.2) {
    // Roughness variations between 0.65 and 0.85
    const rVal = Math.round(165 + Math.random() * 50);
    ctx.strokeStyle = `rgb(${rVal}, ${rVal}, ${rVal})`;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // Radial blade slice cuts are highly scattering/rough (matte #F0F0F0)
  ctx.strokeStyle = '#E0E0E0';
  ctx.lineWidth = 1;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 120) {
    if (Math.random() > 0.4) {
      const startR = 76 + Math.random() * 20;
      const endR = 256 - Math.random() * 5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(angle) * startR, cy + Math.sin(angle) * startR);
      ctx.lineTo(cx + Math.cos(angle) * endR, cy + Math.sin(angle) * endR);
      ctx.stroke();
    }
  }

  return canvas;
}

/**
 * Generates a high-quality, realistic kraft cardboard tube texture for the inner paper core.
 * Features diagonal wound paper board seams, fiber speckles, and heavy matte micro-grain.
 */
export function generateCardboardCoreTexture(): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Cool grey-white paperboard base color
  ctx.fillStyle = '#EBECEF';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Cardboard fiber specks (unbleached recycled wood pulp spots in light grey)
  ctx.fillStyle = 'rgba(100, 100, 100, 0.08)';
  for (let i = 0; i < 400; i++) {
    const rx = Math.random() * canvas.width;
    const ry = Math.random() * canvas.height;
    const rw = 1 + Math.random() * 2.5;
    const rh = 1 + Math.random() * 1.5;
    ctx.fillRect(rx, ry, rw, rh);
  }

  // Beautiful diagonal paper-winding seam lines typical of industrial cardboard tubes
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.lineWidth = 1.5;
  for (let x = -canvas.width; x < canvas.width * 2; x += 128) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + canvas.width / 2, canvas.height);
    ctx.stroke();

    // High-edge white highlight right next to the dark indentation seam to provide 3D relief
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x + 1.5, 0);
    ctx.lineTo(x + canvas.width / 2 + 1.5, canvas.height);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.lineWidth = 1.5;
  }

  // Dense, fine noise grain to give it a rich tactile paperboard look
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 8;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i+1] = Math.min(255, Math.max(0, data[i+1] + noise));
    data[i+2] = Math.min(255, Math.max(0, data[i+2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  return canvas;
}
