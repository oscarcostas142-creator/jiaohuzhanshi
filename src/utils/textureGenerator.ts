import { TapePattern, DeskMaterial } from '../types';

/**
 * Procedurally generates an HTMLCanvasElement with the requested Washi tape pattern.
 */
export function generateTapePattern(pattern: TapePattern): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128; // Rectangular shape to make tile wrapping efficient
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Clear background and draw pattern
  switch (pattern) {
    case 'sage_gold': {
      // Sage Green background
      ctx.fillStyle = '#6F806C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Gold-like color gradient
      const goldGrad = ctx.createLinearGradient(0, 0, 0, canvas.height);
      goldGrad.addColorStop(0, '#E5C158');
      goldGrad.addColorStop(1, '#CFA534');

      // Draw elegant organic leaf branches
      ctx.strokeStyle = goldGrad;
      ctx.fillStyle = goldGrad;
      ctx.lineWidth = 1.5;

      // Draw a continuous wavy stem along the tape
      ctx.beginPath();
      ctx.moveTo(0, canvas.height / 2);
      for (let x = 0; x <= canvas.width; x += 10) {
        const y = canvas.height / 2 + Math.sin((x / canvas.width) * Math.PI * 4) * 15;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // Add delicate leaves along the stem
      for (let x = 20; x < canvas.width; x += 40) {
        const y = canvas.height / 2 + Math.sin((x / canvas.width) * Math.PI * 4) * 15;
        
        // Leaf pointing up-right
        ctx.beginPath();
        ctx.ellipse(x + 10, y - 12, 10, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Leaf pointing down-left
        ctx.beginPath();
        ctx.ellipse(x - 10, y + 12, 10, 4, Math.PI / 4, 0, Math.PI * 2);
        ctx.fill();

        // Small white accent dots
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(x + 25, y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = goldGrad;
      }
      break;
    }

    case 'terracotta_geo': {
      // Warm Earthy Terracotta background
      ctx.fillStyle = '#B85E46';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw retro/scandinavian shapes
      ctx.fillStyle = 'rgba(244, 240, 230, 0.85)'; // Cream
      
      // Cream Arches and Semi circles
      for (let x = 40; x < canvas.width; x += 128) {
        // Arch shape
        ctx.beginPath();
        ctx.arc(x, canvas.height, 35, Math.PI, 0, false);
        ctx.fill();

        // Dark accent circles/lines
        ctx.fillStyle = 'rgba(40, 40, 40, 0.5)';
        ctx.beginPath();
        ctx.arc(x + 64, canvas.height / 2, 16, 0, Math.PI * 2);
        ctx.fill();

        // Little cream dots
        ctx.fillStyle = 'rgba(244, 240, 230, 0.85)';
        ctx.beginPath();
        ctx.arc(x + 64, canvas.height / 2 - 30, 4, 0, Math.PI * 2);
        ctx.arc(x + 64, canvas.height / 2 + 30, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      // Add a thin light-colored running border line near top & bottom
      ctx.strokeStyle = 'rgba(244, 240, 230, 0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, 8);
      ctx.lineTo(canvas.width, 8);
      ctx.moveTo(0, canvas.height - 8);
      ctx.lineTo(canvas.width, canvas.height - 8);
      ctx.stroke();
      break;
    }

    case 'indigo_constellation': {
      // Midnight Indigo Deep Blue background
      ctx.fillStyle = '#1D2436';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw faint nebula cloud dust
      const grad = ctx.createRadialGradient(100, 64, 50, 100, 64, 150);
      grad.addColorStop(0, 'rgba(68, 92, 142, 0.25)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const grad2 = ctx.createRadialGradient(380, 40, 40, 380, 40, 120);
      grad2.addColorStop(0, 'rgba(120, 85, 145, 0.2)');
      grad2.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Constellation lines
      ctx.strokeStyle = 'rgba(160, 190, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      
      const starPoints = [
        { x: 30, y: 30 }, { x: 70, y: 80 }, { x: 120, y: 50 }, { x: 180, y: 90 },
        { x: 230, y: 40 }, { x: 280, y: 70 }, { x: 330, y: 30 }, { x: 390, y: 95 },
        { x: 440, y: 45 }, { x: 490, y: 80 }
      ];

      ctx.moveTo(starPoints[0].x, starPoints[0].y);
      for (let i = 1; i < starPoints.length; i++) {
        ctx.lineTo(starPoints[i].x, starPoints[i].y);
      }
      ctx.stroke();

      // Golden stars
      for (const p of starPoints) {
        // Outer glow
        const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 6);
        glow.addColorStop(0, 'rgba(240, 205, 125, 0.8)');
        glow.addColorStop(1, 'rgba(240, 205, 125, 0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Core star
        ctx.fillStyle = '#FFF8E7';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }

      // Random small background stars
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      for (let i = 0; i < 40; i++) {
        const sx = Math.random() * canvas.width;
        const sy = Math.random() * canvas.height;
        const sr = Math.random() * 0.8 + 0.3;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }

    case 'pastel_grid': {
      // Soft Cream Background
      ctx.fillStyle = '#F5EFE6';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Soft coral-pink grid lines
      ctx.strokeStyle = 'rgba(220, 140, 130, 0.45)';
      ctx.lineWidth = 1;

      const gridSize = 32;

      // Vertical grid lines
      ctx.beginPath();
      for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
      }
      // Horizontal grid lines
      for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
      }
      ctx.stroke();

      // Draw subtle overlapping diagonal warm-beige strokes for accent texture
      ctx.strokeStyle = 'rgba(180, 170, 150, 0.2)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      for (let offset = -canvas.height; offset < canvas.width; offset += 48) {
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset + canvas.height, canvas.height);
      }
      ctx.stroke();
      break;
    }
  }

  // Draw subtle natural paper edge imperfections on left and right borders of the canvas texture,
  // making it blend better when repeated.
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

  // Background is warm beige cardboard/paper core
  ctx.fillStyle = '#E5DEC9';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw concentric rings from radius 180px out to 256px (the outer tape wound area)
  // Inside 180px is the cardboard ring core
  ctx.fillStyle = '#CBBF9D'; // Darker ring for the inner cardboard edge
  ctx.beginPath();
  ctx.arc(cx, cy, 180, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#E5DEC9'; // Back to cardboard center
  ctx.beginPath();
  ctx.arc(cx, cy, 168, 0, Math.PI * 2);
  ctx.fill();

  // Draw cardboard fibers in the core circle
  ctx.strokeStyle = 'rgba(130, 110, 80, 0.15)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 200; i++) {
    const r = Math.random() * 168;
    const theta = Math.random() * Math.PI * 2;
    const px = cx + Math.cos(theta) * r;
    const py = cy + Math.sin(theta) * r;
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(px + (Math.random() - 0.5) * 8, py + (Math.random() - 0.5) * 8);
    ctx.stroke();
  }

  // Draw the wound paper tape layers (radii 180px to 256px)
  // Fill the outer ring with a color close to the tape's base pattern color
  ctx.fillStyle = baseColor;
  ctx.beginPath();
  ctx.arc(cx, cy, 256, 0, Math.PI * 2);
  ctx.arc(cx, cy, 180, 0, Math.PI * 2, true); // Hole cut
  ctx.fill();

  // Draw closely spaced concentric circles representing individual layers
  ctx.lineWidth = 1.2;
  for (let r = 180; r <= 256; r += 1.8) {
    // Add minor variation in color to simulate layers of wound tape and shadows
    const opacity = 0.12 + Math.sin(r * 4.5) * 0.05 + Math.random() * 0.03;
    ctx.strokeStyle = `rgba(0, 0, 0, ${opacity})`;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Occasional light layer edge
    if (Math.random() > 0.75) {
      ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * 0.7})`;
      ctx.beginPath();
      ctx.arc(cx, cy, r + 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // Add subtle radial cutting/slicing textures (matte blade marks on the side roll)
  ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
  ctx.lineWidth = 1;
  for (let angle = 0; angle < Math.PI * 2; angle += Math.PI / 180) {
    if (Math.random() > 0.4) {
      const startR = 180 + Math.random() * 20;
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
 * Generates beautiful desk textures procedurally based on user choice.
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
      // Soft luxury cream paperboard feel
      ctx.fillStyle = '#F3EFEB';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add fine speckles/cardboard fiber spots
      ctx.fillStyle = 'rgba(150, 140, 130, 0.08)';
      for (let i = 0; i < 3000; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = Math.random() * 1.5 + 0.3;
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
