import { TapePattern, DeskMaterial, COLORS } from '../types';

/**
 * Procedurally generates an HTMLCanvasElement with the requested Washi tape pattern.
 * Supports custom uploaded images which are rendered in a repeating elegant stamp layout.
 */
export function generateTapePattern(pattern: TapePattern, customImages?: HTMLImageElement[]): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; // Fixed 1024px width for perfect stability and alignment
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Reusable Rounded Rectangle path helper
  const drawRoundedRect = (
    c: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ) => {
    c.beginPath();
    c.moveTo(x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h - r);
    c.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    c.lineTo(x + r, y + h);
    c.quadraticCurveTo(x, y + h, x, y + h - r);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.closePath();
  };

  // Reusable Arch shape path helper
  const drawArch = (c: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, r: number) => {
    const x = cx - w / 2;
    const y = cy - h / 2;
    c.beginPath();
    c.moveTo(x, y + h);
    c.lineTo(x, y + r);
    c.quadraticCurveTo(x, y, x + r, y);
    c.lineTo(x + w - r, y);
    c.quadraticCurveTo(x + w, y, x + w, y + r);
    c.lineTo(x + w, y + h);
    c.closePath();
  };

  // Reusable Hexagon path helper
  const drawHexagon = (c: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    c.beginPath();
    for (let j = 0; j < 6; j++) {
      const angle = (j * Math.PI) / 3;
      const hx = cx + Math.cos(angle) * r;
      const hy = cy + Math.sin(angle) * r;
      if (j === 0) c.moveTo(hx, hy);
      else c.lineTo(hx, hy);
    }
    c.closePath();
  };

  // Reusable Octagon path helper
  const drawOctagon = (c: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    c.beginPath();
    for (let j = 0; j < 8; j++) {
      const angle = (j * Math.PI) / 4;
      const hx = cx + Math.cos(angle) * r;
      const hy = cy + Math.sin(angle) * r;
      if (j === 0) c.moveTo(hx, hy);
      else c.lineTo(hx, hy);
    }
    c.closePath();
  };

  // Reusable Diamond path helper
  const drawDiamond = (c: CanvasRenderingContext2D, cx: number, cy: number, r: number) => {
    c.beginPath();
    c.moveTo(cx, cy - r);
    c.lineTo(cx + r, cy);
    c.lineTo(cx, cy + r);
    c.lineTo(cx - r, cy);
    c.closePath();
  };

  // Reusable star path helper
  const drawStar = (c: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) => {
    let rot = (Math.PI / 2) * 3;
    let sx = cx;
    let sy = cy;
    const step = Math.PI / spikes;

    c.beginPath();
    c.moveTo(cx, cy - outerRadius);
    for (let j = 0; j < spikes; j++) {
      sx = cx + Math.cos(rot) * outerRadius;
      sy = cy + Math.sin(rot) * outerRadius;
      c.lineTo(sx, sy);
      rot += step;

      sx = cx + Math.cos(rot) * innerRadius;
      sy = cy + Math.sin(rot) * innerRadius;
      c.lineTo(sx, sy);
      rot += step;
    }
    c.lineTo(cx, cy - outerRadius);
    c.closePath();
  };

  // Reusable crescent moon path helper
  const drawCrescentMoon = (c: CanvasRenderingContext2D, cx: number, cy: number, radius: number) => {
    c.beginPath();
    c.arc(cx, cy, radius, Math.PI * 0.5, Math.PI * 1.5, false);
    // Draw an inner curve to create a crescent
    c.quadraticCurveTo(cx + radius * 0.4, cy, cx, cy + radius);
    c.closePath();
  };

  // Clean, high quality matte off-white washi paper base
  ctx.fillStyle = COLORS.tapeBaseColor; // Warm white paper base
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Very subtle edge stitching/lines representing a beautiful stationary tape carrier
  ctx.strokeStyle = '#ECE9E2';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 4);
  ctx.lineTo(canvas.width, 4);
  ctx.moveTo(0, canvas.height - 4);
  ctx.lineTo(canvas.width, canvas.height - 4);
  ctx.stroke();

  const numSlots = 8;
  const slotWidth = 1024 / numSlots; // exactly 128px per slot

  for (let i = 0; i < numSlots; i++) {
    const cx = i * slotWidth + slotWidth / 2;
    const cy = 64;

    const cardSize = 76; // Reduced from 108 to make gaps/spacing between patterns larger and elegant
    const cardX = i * slotWidth + (slotWidth - cardSize) / 2; // Perfectly centered horizontally
    const cardY = (128 - cardSize) / 2; // Perfectly centered vertically
    const cardRadius = 8;

    // 1. Draw elegant sticker card base (die-cut white paper sticker segment)
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.05)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;

    ctx.fillStyle = '#FFFFFF';
    drawRoundedRect(ctx, cardX, cardY, cardSize, cardSize, cardRadius);
    ctx.fill();

    // Reset shadow
    ctx.shadowColor = 'transparent';

    ctx.strokeStyle = '#E6E1D8';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, cardX, cardY, cardSize, cardSize, cardRadius);
    ctx.stroke();
    ctx.restore();

    // Determine sequence index (1, 2, 3, 4 loop)
    const idx = i % 4;

    // Draw inner graphics based on the selected pattern
    switch (pattern) {
      case 'sage_gold': {
        const sageColor = '#8DA08A';
        
        // Generate beautiful gold gradient for foil illustrations
        const goldGrad = ctx.createLinearGradient(cx - 30, cy - 30, cx + 30, cy + 30);
        goldGrad.addColorStop(0, '#E8C560');
        goldGrad.addColorStop(0.5, '#F9E29C');
        goldGrad.addColorStop(1, '#D6AA33');

        ctx.save();
        if (idx === 0) {
          // Card 1: Circular badge with golden branches
          ctx.fillStyle = sageColor;
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = goldGrad;
          ctx.lineWidth = 2;
          ctx.stroke();

          // Golden twig
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.moveTo(cx - 18, cy + 18);
          ctx.quadraticCurveTo(cx - 2, cy + 2, cx + 18, cy - 18);
          ctx.stroke();

          // Golden leaves
          ctx.fillStyle = goldGrad;
          ctx.beginPath();
          ctx.ellipse(cx - 10, cy + 10, 7, 3, Math.PI / 4, 0, Math.PI * 2);
          ctx.ellipse(cx + 3, cy - 3, 7, 3, Math.PI / 4, 0, Math.PI * 2);
          ctx.ellipse(cx + 14, cy - 14, 5, 2, Math.PI / 4, 0, Math.PI * 2);
          ctx.fill();
        } else if (idx === 1) {
          // Card 2: Rounded square with Monstera Leaf outline
          ctx.fillStyle = sageColor;
          drawRoundedRect(ctx, cx - 40, cy - 40, 80, 80, 10);
          ctx.fill();

          ctx.strokeStyle = goldGrad;
          ctx.lineWidth = 1.5;
          drawRoundedRect(ctx, cx - 40, cy - 40, 80, 80, 10);
          ctx.stroke();

          // Elegant Monstera / Maple Leaf drawing
          ctx.strokeStyle = goldGrad;
          ctx.fillStyle = goldGrad;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(cx - 22, cy + 22);
          ctx.lineTo(cx + 22, cy - 22); // Main vein
          ctx.stroke();

          // Draw leaves segments
          ctx.beginPath();
          ctx.arc(cx - 2, cy - 2, 18, -Math.PI / 4, Math.PI / 2);
          ctx.arc(cx + 6, cy + 6, 18, Math.PI * 0.75, Math.PI * 1.5);
          ctx.fill();
        } else if (idx === 2) {
          // Card 3: Hexagon badge with Tulip
          ctx.fillStyle = sageColor;
          drawHexagon(ctx, cx, cy, 40);
          ctx.fill();

          ctx.strokeStyle = goldGrad;
          ctx.lineWidth = 1.5;
          drawHexagon(ctx, cx, cy, 40);
          ctx.stroke();

          // Tulip illustration
          ctx.strokeStyle = goldGrad;
          ctx.fillStyle = goldGrad;
          ctx.lineWidth = 2;
          // Stem
          ctx.beginPath();
          ctx.moveTo(cx, cy + 24);
          ctx.quadraticCurveTo(cx - 6, cy + 8, cx, cy - 4);
          ctx.stroke();

          // Leaf
          ctx.beginPath();
          ctx.ellipse(cx - 12, cy + 12, 12, 4, -Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();

          // Flower petals
          ctx.beginPath();
          ctx.arc(cx, cy - 12, 10, 0, Math.PI, true);
          ctx.closePath();
          ctx.fill();

          ctx.beginPath();
          ctx.moveTo(cx - 10, cy - 12);
          ctx.lineTo(cx - 5, cy - 24);
          ctx.lineTo(cx, cy - 14);
          ctx.lineTo(cx + 5, cy - 24);
          ctx.lineTo(cx + 10, cy - 12);
          ctx.closePath();
          ctx.fill();
        } else {
          // Card 4: Arch shape with Ginkgo leaf
          ctx.fillStyle = sageColor;
          drawArch(ctx, cx, cy, 80, 80, 40);
          ctx.fill();

          ctx.strokeStyle = goldGrad;
          ctx.lineWidth = 1.5;
          drawArch(ctx, cx, cy, 80, 80, 40);
          ctx.stroke();

          // Ginkgo leaf fan shape
          ctx.fillStyle = goldGrad;
          ctx.strokeStyle = goldGrad;
          ctx.lineWidth = 2;

          // Stem
          ctx.beginPath();
          ctx.moveTo(cx - 15, cy + 25);
          ctx.quadraticCurveTo(cx - 5, cy + 15, cx, cy + 5);
          ctx.stroke();

          // Fan
          ctx.beginPath();
          ctx.moveTo(cx, cy + 5);
          ctx.bezierCurveTo(cx - 28, cy - 15, cx - 24, cy - 30, cx - 5, cy - 20);
          ctx.lineTo(cx, cy - 12); // Split in ginkgo leaf
          ctx.bezierCurveTo(cx + 24, cy - 30, cx + 28, cy - 15, cx, cy + 5);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        break;
      }

      case 'terracotta_geo': {
        const terraColor = '#C46A52';
        const creamColor = '#FDFBF7';
        const charcoalColor = '#3E3E3E';

        ctx.save();
        if (idx === 0) {
          // Card 1: Arch with Boho Sun
          ctx.fillStyle = terraColor;
          drawArch(ctx, cx, cy, 80, 80, 40);
          ctx.fill();

          // Cream smaller arch
          ctx.fillStyle = creamColor;
          drawArch(ctx, cx, cy + 15, 50, 50, 25);
          ctx.fill();

          // Charcoal sun
          ctx.fillStyle = charcoalColor;
          ctx.beginPath();
          ctx.arc(cx, cy - 12, 10, 0, Math.PI * 2);
          ctx.fill();

          // Sun ray dashes
          ctx.strokeStyle = creamColor;
          ctx.lineWidth = 1.5;
          for (let r = 0; r < 8; r++) {
            const angle = (r * Math.PI) / 4;
            const x1 = cx + Math.cos(angle) * 14;
            const y1 = cy - 12 + Math.sin(angle) * 14;
            const x2 = cx + Math.cos(angle) * 20;
            const y2 = cy - 12 + Math.sin(angle) * 20;
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
          }
        } else if (idx === 1) {
          // Card 2: Circle with Moon and Stars
          ctx.fillStyle = terraColor;
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.fill();

          // Cream crescent moon
          ctx.fillStyle = creamColor;
          drawCrescentMoon(ctx, cx - 5, cy, 20);
          ctx.fill();

          // Charcoal stars
          ctx.fillStyle = charcoalColor;
          drawStar(ctx, cx + 18, cy - 12, 4, 6, 2.5);
          ctx.fill();
          drawStar(ctx, cx + 12, cy + 14, 4, 4, 1.5);
          ctx.fill();
        } else if (idx === 2) {
          // Card 3: Rounded Square with Mountains
          ctx.fillStyle = terraColor;
          drawRoundedRect(ctx, cx - 40, cy - 40, 80, 80, 10);
          ctx.fill();

          // Mountain 1 (Charcoal, larger, back)
          ctx.fillStyle = charcoalColor;
          ctx.beginPath();
          ctx.moveTo(cx - 30, cy + 40);
          ctx.lineTo(cx + 5, cy - 10);
          ctx.lineTo(cx + 40, cy + 40);
          ctx.closePath();
          ctx.fill();

          // Mountain 2 (Cream, front)
          ctx.fillStyle = creamColor;
          ctx.beginPath();
          ctx.moveTo(cx - 40, cy + 40);
          ctx.lineTo(cx - 10, cy + 5);
          ctx.lineTo(cx + 20, cy + 40);
          ctx.closePath();
          ctx.fill();

          // Small Cream Sun
          ctx.fillStyle = creamColor;
          ctx.beginPath();
          ctx.arc(cx + 18, cy - 16, 7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Card 4: Diamond with Balancing Stones
          ctx.fillStyle = terraColor;
          drawDiamond(ctx, cx, cy, 40);
          ctx.fill();

          // Draw vertical stack of balanced smooth pebbles
          // Bottom stone: Cream oval
          ctx.fillStyle = creamColor;
          ctx.beginPath();
          ctx.ellipse(cx, cy + 18, 22, 9, 0, 0, Math.PI * 2);
          ctx.fill();

          // Middle stone: Charcoal oval
          ctx.fillStyle = charcoalColor;
          ctx.beginPath();
          ctx.ellipse(cx - 2, cy, 16, 7, -0.05, 0, Math.PI * 2);
          ctx.fill();

          // Top stone: Warm ochre yellow
          ctx.fillStyle = '#D4A359';
          ctx.beginPath();
          ctx.ellipse(cx + 1, cy - 14, 10, 5, 0.08, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        break;
      }

      case 'indigo_constellation': {
        const indigoColor = '#1B2232';
        const goldColor = '#FCE3A1';
        const whiteColor = '#FFFFFF';

        ctx.save();
        if (idx === 0) {
          // Card 1: Circle with Big Dipper
          ctx.fillStyle = indigoColor;
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = 'rgba(252, 227, 161, 0.4)';
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.stroke();

          // Constellation stars & lines
          const stars = [
            { x: cx - 24, y: cy + 15 },
            { x: cx - 12, y: cy + 8 },
            { x: cx, y: cy + 12 },
            { x: cx + 10, y: cy },
            { x: cx + 5, y: cy - 15 },
            { x: cx + 22, y: cy - 20 },
            { x: cx + 24, y: cy - 4 }
          ];

          // Draw lines
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(stars[0].x, stars[0].y);
          for (let s = 1; s < stars.length; s++) {
            ctx.lineTo(stars[s].x, stars[s].y);
          }
          ctx.stroke();

          // Draw stars
          ctx.fillStyle = goldColor;
          for (const s of stars) {
            ctx.beginPath();
            ctx.arc(s.x, s.y, 2.5, 0, Math.PI * 2);
            ctx.fill();
            
            // tiny flares
            ctx.strokeStyle = 'rgba(252, 227, 161, 0.6)';
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(s.x - 4, s.y); ctx.lineTo(s.x + 4, s.y);
            ctx.moveTo(s.x, s.y - 4); ctx.lineTo(s.x, s.y + 4);
            ctx.stroke();
          }
        } else if (idx === 1) {
          // Card 2: Rounded Square with Saturn
          ctx.fillStyle = indigoColor;
          drawRoundedRect(ctx, cx - 40, cy - 40, 80, 80, 10);
          ctx.fill();

          ctx.strokeStyle = 'rgba(252, 227, 161, 0.4)';
          ctx.lineWidth = 1.2;
          drawRoundedRect(ctx, cx - 40, cy - 40, 80, 80, 10);
          ctx.stroke();

          // Saturn Ring
          ctx.strokeStyle = whiteColor;
          ctx.lineWidth = 4;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(-Math.PI / 6);
          ctx.beginPath();
          ctx.ellipse(0, 0, 28, 8, 0, 0, Math.PI * 2);
          ctx.stroke();
          ctx.restore();

          // Planet body
          ctx.fillStyle = goldColor;
          ctx.beginPath();
          ctx.arc(cx, cy, 14, 0, Math.PI * 2);
          ctx.fill();

          // Front Ring portion highlight
          ctx.strokeStyle = 'rgba(255,255,255,0.95)';
          ctx.lineWidth = 2.5;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(-Math.PI / 6);
          ctx.beginPath();
          ctx.ellipse(0, 0, 28, 8, 0, 0, Math.PI); // Half ring facing front
          ctx.stroke();
          ctx.restore();

          // Sparkle star
          ctx.fillStyle = whiteColor;
          drawStar(ctx, cx - 22, cy - 22, 4, 5, 1.5);
          ctx.fill();
        } else if (idx === 2) {
          // Card 3: Diamond with Galaxy & Moon
          ctx.fillStyle = indigoColor;
          drawDiamond(ctx, cx, cy, 40);
          ctx.fill();

          ctx.strokeStyle = 'rgba(252, 227, 161, 0.4)';
          ctx.lineWidth = 1.2;
          drawDiamond(ctx, cx, cy, 40);
          ctx.stroke();

          // Spiral galaxy swirl
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          for (let theta = 0; theta < Math.PI * 5; theta += 0.1) {
            const r = theta * 1.5;
            const x = cx + Math.cos(theta) * r + 8;
            const y = cy + Math.sin(theta) * r + 10;
            if (theta === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.stroke();

          // Golden moon
          ctx.fillStyle = goldColor;
          drawCrescentMoon(ctx, cx - 12, cy - 12, 14);
          ctx.fill();

          // Small stars
          ctx.fillStyle = whiteColor;
          drawStar(ctx, cx + 18, cy - 16, 4, 4, 1.2);
          ctx.fill();
        } else {
          // Card 4: Arch with Shooting Star
          ctx.fillStyle = indigoColor;
          drawArch(ctx, cx, cy, 80, 80, 40);
          ctx.fill();

          ctx.strokeStyle = 'rgba(252, 227, 161, 0.4)';
          ctx.lineWidth = 1.2;
          drawArch(ctx, cx, cy, 80, 80, 40);
          ctx.stroke();

          // Tail trails
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.moveTo(cx - 24, cy + 24);
          ctx.lineTo(cx + 8, cy - 8);
          ctx.moveTo(cx - 15, cy + 26);
          ctx.lineTo(cx + 10, cy + 1);
          ctx.moveTo(cx - 26, cy + 15);
          ctx.lineTo(cx - 1, cy - 10);
          ctx.stroke();

          // Shooting star head
          ctx.fillStyle = goldColor;
          drawStar(ctx, cx + 12, cy - 12, 4, 9, 3);
          ctx.fill();
        }
        ctx.restore();
        break;
      }

      case 'pastel_grid': {
        const redColor = COLORS.stampRed; // Oriental Vermilion Ink Red
        const sumiColor = COLORS.stampBlack; // Sumi Ink Black

        ctx.save();
        if (idx === 0) {
          // Card 1: Circular double ring seal with branch
          // Outer red ring
          ctx.strokeStyle = redColor;
          ctx.lineWidth = 2.2;
          ctx.beginPath();
          ctx.arc(cx, cy, 40, 0, Math.PI * 2);
          ctx.stroke();

          // Inner thin red ring
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.arc(cx, cy, 35, 0, Math.PI * 2);
          ctx.stroke();

          // Sumi black twig
          ctx.strokeStyle = sumiColor;
          ctx.lineWidth = 1.8;
          ctx.beginPath();
          ctx.moveTo(cx - 16, cy + 14);
          ctx.quadraticCurveTo(cx - 2, cy, cx + 12, cy - 14);
          ctx.stroke();

          // Tiny leaf blobs
          ctx.fillStyle = sumiColor;
          ctx.beginPath();
          ctx.arc(cx - 6, cy + 4, 3, 0, Math.PI * 2);
          ctx.arc(cx + 4, cy - 6, 3, 0, Math.PI * 2);
          ctx.fill();

          // Red signature block
          ctx.fillStyle = redColor;
          ctx.fillRect(cx - 20, cy - 18, 11, 11);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(cx - 17, cy - 13);
          ctx.lineTo(cx - 12, cy - 13);
          ctx.moveTo(cx - 15, cy - 15);
          ctx.lineTo(cx - 15, cy - 10);
          ctx.stroke();
        } else if (idx === 1) {
          // Card 2: Square border with Bamboo Sumi
          ctx.strokeStyle = redColor;
          ctx.lineWidth = 2;
          drawRoundedRect(ctx, cx - 40, cy - 40, 80, 80, 4);
          ctx.stroke();

          ctx.lineWidth = 0.8;
          drawRoundedRect(ctx, cx - 35, cy - 35, 70, 70, 2);
          ctx.stroke();

          // Black bamboo stalk & leaves
          ctx.strokeStyle = sumiColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          // Main stalk
          ctx.moveTo(cx - 10, cy + 30);
          ctx.quadraticCurveTo(cx - 8, cy, cx - 5, cy - 30);
          ctx.stroke();

          // Bamboo segments
          ctx.fillStyle = '#FFFFFF';
          ctx.strokeStyle = sumiColor;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(cx - 8.5, cy + 10, 1.5, 0, Math.PI * 2);
          ctx.arc(cx - 7, cy - 10, 1.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Bamboo leaves
          ctx.fillStyle = sumiColor;
          ctx.beginPath();
          ctx.ellipse(cx - 10, cy - 2, 10, 3.2, Math.PI / 6, 0, Math.PI * 2);
          ctx.ellipse(cx + 6, cy - 15, 12, 3.8, -Math.PI / 4, 0, Math.PI * 2);
          ctx.ellipse(cx + 1, cy + 2, 8, 2.8, -Math.PI / 10, 0, Math.PI * 2);
          ctx.fill();

          // Little stamp seal
          ctx.fillStyle = redColor;
          ctx.beginPath();
          ctx.arc(cx + 20, cy + 16, 6, 0, Math.PI * 2);
          ctx.fill();
        } else if (idx === 2) {
          // Card 3: Octagonal red border with Mountain Peaks
          ctx.strokeStyle = redColor;
          ctx.lineWidth = 1.8;
          drawOctagon(ctx, cx, cy, 40);
          ctx.stroke();

          // Mountain outline sumi black
          ctx.strokeStyle = sumiColor;
          ctx.lineWidth = 2;
          ctx.fillStyle = 'rgba(44, 44, 44, 0.05)';
          ctx.beginPath();
          ctx.moveTo(cx - 30, cy + 20);
          ctx.lineTo(cx - 10, cy - 15);
          ctx.lineTo(cx + 8, cy + 10);
          ctx.lineTo(cx + 20, cy - 5);
          ctx.lineTo(cx + 32, cy + 20);
          ctx.stroke();
          ctx.fill();

          // Rising Red Sun
          ctx.fillStyle = redColor;
          ctx.beginPath();
          ctx.arc(cx + 14, cy - 16, 7, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Card 4: Hexagonal border with Lotus flower
          ctx.strokeStyle = redColor;
          ctx.lineWidth = 1.8;
          drawHexagon(ctx, cx, cy, 40);
          ctx.stroke();

          // Lotus flower Sumi drawing
          ctx.strokeStyle = sumiColor;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
          ctx.lineWidth = 1.5;

          // Draw lotus petals
          ctx.beginPath();
          // Central petal
          ctx.ellipse(cx, cy, 14, 6, -Math.PI / 2, 0, Math.PI * 2);
          // Side petals
          ctx.ellipse(cx - 8, cy + 2, 12, 5, -Math.PI / 3, 0, Math.PI * 2);
          ctx.ellipse(cx + 8, cy + 2, 12, 5, -Math.PI / 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();

          // Stem
          ctx.beginPath();
          ctx.moveTo(cx, cy + 12);
          ctx.lineTo(cx, cy + 28);
          ctx.stroke();

          // Tiny red rectangular seal
          ctx.fillStyle = redColor;
          ctx.fillRect(cx - 24, cy + 10, 7, 12);
        }
        ctx.restore();
        break;
      }

      case 'custom': {
        if (customImages && customImages.length > 0) {
          // Retrieve the current image in rotation
          const img = customImages[i % customImages.length];
          try {
            const imgW = img.width || 100;
            const imgH = img.height || 100;
            
            // Fit inside a padded inner square (max size 56x56 to look elegant inside the card)
            const maxW = 56;
            const maxH = 56;
            const scale = Math.min(maxW / imgW, maxH / imgH);
            const w = imgW * scale;
            const h = imgH * scale;

            const imgX = cx - w / 2;
            const imgY = cy - h / 2;

            ctx.save();
            // Draw a subtle border around the image boundary to make it look like an elegant photo sticker
            ctx.shadowColor = 'rgba(0, 0, 0, 0.02)';
            ctx.shadowBlur = 2;
            ctx.shadowOffsetY = 1;

            ctx.drawImage(img, imgX, imgY, w, h);

            // Fine outer picture outline
            ctx.strokeStyle = '#F0EDE6';
            ctx.lineWidth = 1;
            ctx.strokeRect(imgX, imgY, w, h);
            ctx.restore();
          } catch (e) {
            console.error('Error rendering custom image inside sticker segment:', e);
          }
        } else {
          // Highly-polished placeholder sticker if no custom images uploaded yet
          ctx.save();
          ctx.strokeStyle = '#D1C9BE';
          ctx.lineWidth = 1.2;
          ctx.setLineDash([4, 4]);
          
          // Draw a beautiful inner dashed card frame
          drawRoundedRect(ctx, cardX + 8, cardY + 8, cardSize - 16, cardSize - 16, 6);
          ctx.stroke();
          ctx.setLineDash([]);

          // Simple elegant custom vector camera/plus icon
          ctx.strokeStyle = '#998D7C';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          // Camera box
          ctx.rect(cx - 15, cy - 8, 30, 20);
          // Camera lens
          ctx.arc(cx, cy + 2, 6, 0, Math.PI * 2);
          // Camera flash/prism
          ctx.moveTo(cx - 8, cy - 8);
          ctx.lineTo(cx - 5, cy - 12);
          ctx.lineTo(cx + 5, cy - 12);
          ctx.lineTo(cx + 8, cy - 8);
          ctx.stroke();

          // Plus sign overlay
          ctx.strokeStyle = '#D1C9BE';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(cx - 24, cy - 18);
          ctx.lineTo(cx - 16, cy - 18);
          ctx.moveTo(cx - 20, cy - 22);
          ctx.lineTo(cx - 20, cy - 14);
          ctx.stroke();

          ctx.fillStyle = '#948775';
          ctx.font = 'bold 9px system-ui, -apple-system, sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('ADD IMAGE', cx, cy + 24);
          ctx.restore();
        }
        break;
      }
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
