import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const VIDEO_PRESETS = {
  S: { w: 1024, h: 2048 },
  P: { w: 768, h: 2048 },
  L: { w: 1280, h: 1440 }
};

function assetFor(objDef, assets) {
  if (!objDef || !objDef.asset || !Array.isArray(assets)) return null;
  return assets.find(asset => asset && asset.id === objDef.asset) || null;
}

function materialValue(material, key, fallback) {
  return material && material[key] !== undefined ? material[key] : fallback;
}

/* ===== 程序化透明/特效贴图 demo:<kind> ===== */
function demoTexture(spec) {
  const kind = String(spec || '').replace(/^demo:/, '') || 'glow';
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const c = canvas.getContext('2d');
  c.clearRect(0, 0, 256, 256);

  if (kind === 'glow') {
    const g = c.createRadialGradient(128, 128, 8, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, 256, 256);
  } else if (kind === 'beam') {
    const v = c.createLinearGradient(0, 256, 0, 0);
    v.addColorStop(0, 'rgba(255,255,255,0.9)');
    v.addColorStop(0.7, 'rgba(255,255,255,0.3)');
    v.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = v;
    c.fillRect(0, 0, 256, 256);
    c.globalCompositeOperation = 'destination-in';
    const h = c.createLinearGradient(0, 0, 256, 0);
    h.addColorStop(0, 'rgba(0,0,0,0)');
    h.addColorStop(0.5, 'rgba(0,0,0,1)');
    h.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = h;
    c.fillRect(0, 0, 256, 256);
    c.globalCompositeOperation = 'source-over';
  } else if (kind === 'lattice') {
    c.strokeStyle = 'rgba(255,255,255,0.9)';
    c.lineWidth = 3;
    for (let i = 0; i <= 256; i += 32) {
      c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 256); c.stroke();
      c.beginPath(); c.moveTo(0, i); c.lineTo(256, i); c.stroke();
    }
  } else if (kind === 'ring') {
    c.strokeStyle = 'rgba(255,255,255,0.95)';
    c.lineWidth = 6;
    c.beginPath(); c.arc(128, 128, 104, 0, Math.PI * 2); c.stroke();
    c.lineWidth = 3;
    c.beginPath(); c.arc(128, 128, 78, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      c.beginPath();
      c.moveTo(128 + Math.cos(a) * 78, 128 + Math.sin(a) * 78);
      c.lineTo(128 + Math.cos(a) * 104, 128 + Math.sin(a) * 104);
      c.stroke();
    }
  } else if (kind.startsWith('symbol')) {
    const ch = kind.split(':')[1] || '符';
    c.fillStyle = 'rgba(255,255,255,0.95)';
    c.font = 'bold 180px serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(ch, 128, 140);
  } else if (kind === 'flame') {
    for (let i = 0; i < 40; i++) {
      const x = 128 + (Math.random() - 0.5) * 120;
      const y = 230 - Math.random() * 200;
      const r = 8 + Math.random() * 22;
      const g = c.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.55)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  if (texture.colorSpace !== undefined) texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function resolveAssetUrl(url) {
  if (!url || typeof url !== 'string') return '';
  if (url.startsWith('local://')) {
    return (typeof window !== 'undefined' && window.__xiyouBlobMap?.get(url)) || '';
  }
  return url;
}

function quadTextureFor(objDef, assets) {
  const alpha = materialValue(objDef.material, 'alpha', '');
  if (typeof alpha === 'string' && alpha.startsWith('demo:')) return demoTexture(alpha);
  const asset = assetFor(objDef, assets);
  const assetUrl = resolveAssetUrl(asset?.url);
  if (assetUrl) return new THREE.TextureLoader().load(assetUrl);
  if (typeof alpha === 'string' && alpha) return new THREE.TextureLoader().load(alpha);
  return placeholderTexture(objDef.name || 'QUAD');
}

function applyCommonMaterial(material, mat) {
  const opacity = materialValue(mat, 'opacity', 1);
  const hasAlpha = typeof mat?.alpha === 'string' && mat.alpha.length > 0;
  material.transparent = opacity < 1 || hasAlpha || mat?.blend === 'additive';
  material.opacity = opacity;
  if (mat?.blend === 'additive') {
    material.blending = THREE.AdditiveBlending;
    material.depthWrite = false;
  }
  if (mat?.cutout) {
    material.alphaTest = 0.35;
    material.transparent = false;
  }
  if (mat?.color) material.color = new THREE.Color(mat.color);
  return material;
}

function createQuad(objDef, assets) {
  const texture = quadTextureFor(objDef, assets);

  if (texture.colorSpace !== undefined) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }

  const material = applyCommonMaterial(new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide
  }), objDef.material);

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.name = objDef.name || 'Quad';
  return mesh;
}

function createVideoQuad(objDef, assets) {
  const asset = assetFor(objDef, assets);
  const plain = objDef.material && objDef.material.preset === 'plain';
  const preset = objDef.material && VIDEO_PRESETS[objDef.material.preset]
    ? VIDEO_PRESETS[objDef.material.preset]
    : null;
  const aspect = preset ? (preset.w * 2) / preset.h : (plain ? 16 / 9 : 0.75);

  if (plain) {
    // 普通视频：无透明通道，直接贴 VideoTexture
    const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
    let plainVideo = null;
    if (resolveAssetUrl(asset?.url)) {
      plainVideo = document.createElement('video');
      plainVideo.src = resolveAssetUrl(asset.url);
      plainVideo.loop = true;
      plainVideo.muted = true;
      plainVideo.playsInline = true;
      plainVideo.setAttribute('playsinline', '');
      plainVideo.preload = 'auto';
      const vt = new THREE.VideoTexture(plainVideo);
      vt.colorSpace = THREE.SRGBColorSpace;
      material.map = vt;
    } else {
      material.map = demoTexture('lattice');
    }
    applyCommonMaterial(material, objDef.material);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(aspect, 1), material);
    m.name = objDef.name || 'Video Quad';
    m.userData.video = plainVideo;
    return m;
  }

  const uniforms = stackedAlphaShader().uniforms;
  let video = null;

  if (resolveAssetUrl(asset?.url)) {
    video = document.createElement('video');
    video.src = resolveAssetUrl(asset.url);
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    uniforms.map.value = texture;
    uniforms.texel.value.set(1 / 2048, 1 / 2048);
  } else {
    uniforms.map.value = demoTexture('lattice');
  }

  const shader = stackedAlphaShader();
  shader.uniforms.map.value = uniforms.map.value;
  shader.uniforms.texel.value.copy(uniforms.texel.value);

  const material = new THREE.ShaderMaterial({
    vertexShader: shader.vertexShader,
    fragmentShader: shader.fragmentShader,
    uniforms: shader.uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  });

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(aspect, 1),
    material
  );

  mesh.name = objDef.name || 'Video Quad';
  mesh.userData.video = video;
  return mesh;
}

function createGlb(objDef, assets) {
  const asset = assetFor(objDef, assets);
  const root = new THREE.Group();
  root.name = objDef.name || 'GLB';

  const placeholder = new THREE.Group();
  const box = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshBasicMaterial({
      color: materialValue(objDef.material, 'color', 0xe68a2e),
      wireframe: true,
      transparent: true,
      opacity: 0.95
    })
  );
  placeholder.add(box);

  const diagonalMaterial = new THREE.LineBasicMaterial({
    color: 0xffb347,
    transparent: true,
    opacity: 0.95
  });
  const diagonalGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-0.5, -0.5, -0.5),
    new THREE.Vector3(0.5, 0.5, 0.5),
    new THREE.Vector3(-0.5, 0.5, -0.5),
    new THREE.Vector3(0.5, -0.5, 0.5)
  ]);
  placeholder.add(new THREE.LineSegments(diagonalGeometry, diagonalMaterial));
  root.add(placeholder);

  root.userData.placeholder = placeholder;

  if (resolveAssetUrl(asset?.url)) {
    const loader = new GLTFLoader();
    loader.load(
      resolveAssetUrl(asset.url),
      gltf => {
        root.remove(placeholder);
        root.add(gltf.scene);
        root.userData.animations = gltf.animations || [];
        root.userData.loadedScene = gltf.scene;
      },
      undefined,
      () => {}
    );
  }

  return root;
}

function createSplatSegment(objDef) {
  const group = new THREE.Group();
  group.name = objDef.name || 'Splat Segment';

  const count = 2000;
  const positions = new Float32Array(count * 3);

  for (let i = 0; i < count; i += 1) {
    const radius = Math.pow(Math.random(), 1 / 3);
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);

    positions[i * 3] = Math.sin(phi) * Math.cos(theta) * radius;
    positions[i * 3 + 1] = Math.cos(phi) * radius * 0.75;
    positions[i * 3 + 2] = Math.sin(phi) * Math.sin(theta) * radius;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

  const segMat = objDef.material || {};
  const segColor = segMat.color ? new THREE.Color(segMat.color) : new THREE.Color(0x7fd4c1);
  const segOpacity = materialValue(segMat, 'opacity', 0.9);
  const pointSize = Number(segMat.point_size) || 0.02;

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: pointSize,
      color: segColor,
      sizeAttenuation: true,
      transparent: true,
      opacity: segOpacity,
      blending: segMat.blend === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: segMat.blend !== 'additive'
    })
  );
  group.add(points);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshBasicMaterial({
      color: segColor,
      transparent: true,
      opacity: segOpacity * 0.09,
      wireframe: false,
      depthWrite: false,
      side: THREE.DoubleSide
    })
  );
  shell.scale.set(1, 0.75, 1);
  group.add(shell);

  return group;
}

function createLight(objDef) {
  const material = objDef.material || {};
  const color = materialValue(material, 'color', 0xffe0a0);
  const intensity = materialValue(material, 'intensity', 1.5);
  const range = materialValue(material, 'range', 6);

  const group = new THREE.Group();
  group.name = objDef.name || 'Light';

  const light = new THREE.PointLight(color, intensity, range);
  group.add(light);

  const visual = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 12, 8),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9
    })
  );
  visual.name = 'light-visual';
  group.add(visual);

  return group;
}

function createHitbox(objDef, node) {
  const hitbox = hitboxOf(objDef);
  let type = hitbox.type;

  if (type === 'auto') {
    const bounds = new THREE.Box3().setFromObject(node);
    const center = new THREE.Vector3();
    const size = new THREE.Vector3();

    if (!bounds.isEmpty()) {
      bounds.getCenter(center);
      bounds.getSize(size);

      const inverseScale = new THREE.Vector3(
        node.scale.x || 1,
        node.scale.y || 1,
        node.scale.z || 1
      );

      node.worldToLocal(center);
      size.set(
        size.x / Math.abs(inverseScale.x),
        size.y / Math.abs(inverseScale.y),
        size.z / Math.abs(inverseScale.z)
      );

      hitbox.center = center.toArray();
      hitbox.size = [
        Math.max(size.x, 0.001),
        Math.max(size.y, 0.001),
        Math.max(size.z, 0.001)
      ];
    }

    type = 'box';
  }

  if (type !== 'box' && type !== 'sphere') return null;

  const center = hitbox.center || [0, 0, 0];
  const size = hitbox.size || [1, 1, 1];
  let helper;

  if (type === 'sphere') {
    const radius = Math.max(size[0], size[1], size[2]) * 0.5;
    helper = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 20, 12),
      new THREE.MeshBasicMaterial({
        color: 0x48d597,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    helper.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(new THREE.SphereGeometry(radius, 16, 10)),
      new THREE.LineBasicMaterial({
        color: 0x48d597,
        transparent: true,
        opacity: 0.8
      })
    ));
  } else {
    const geometry = new THREE.BoxGeometry(size[0], size[1], size[2]);
    helper = new THREE.Mesh(
      geometry,
      new THREE.MeshBasicMaterial({
        color: 0x48d597,
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    helper.add(new THREE.LineSegments(
      new THREE.EdgesGeometry(geometry),
      new THREE.LineBasicMaterial({
        color: 0x48d597,
        transparent: true,
        opacity: 0.8
      })
    ));
  }

  helper.position.fromArray(center);
  helper.name = 'hitbox';
  helper.userData.isHelper = true;
  return helper;
}

export function createNode(objDef, assets = []) {
  const type = objDef && objDef.type ? objDef.type : 'quad';
  let node;

  if (type === 'quad') {
    node = createQuad(objDef, assets);
  } else if (type === 'video_quad') {
    node = createVideoQuad(objDef, assets);
  } else if (type === 'glb') {
    node = createGlb(objDef, assets);
  } else if (type === 'splat_segment') {
    node = createSplatSegment(objDef);
  } else if (type === 'light') {
    node = createLight(objDef);
  } else {
    node = new THREE.Group();
  }

  node.userData.id = objDef.id;
  node.userData.objType = type;
  node.userData.objDef = objDef;

  applyTransform(node, objDef);

  const helper = createHitbox(objDef, node);
  if (helper) {
    node.add(helper);
  }

  return node;
}

export function applyTransform(node, objDef) {
  const transform = objDef && objDef.transform ? objDef.transform : {};
  const p = Array.isArray(transform.p) ? transform.p : [0, 0, 0];
  const r = Array.isArray(transform.r) ? transform.r : [0, 0, 0];
  const s = Array.isArray(transform.s) ? transform.s : [1, 1, 1];

  node.position.fromArray(p);
  node.rotation.set(
    THREE.MathUtils.degToRad(r[0] || 0),
    THREE.MathUtils.degToRad(r[1] || 0),
    THREE.MathUtils.degToRad(r[2] || 0)
  );
  node.scale.fromArray(s);
}

export function stackedAlphaShader() {
  return {
    uniforms: {
      map: { value: placeholderTexture('VIDEO', '#dfe8e0') },
      texel: { value: new THREE.Vector2(1 / 128, 1 / 128) }
    },
    vertexShader: `
      varying vec2 vUv;

      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D map;
      uniform vec2 texel;
      varying vec2 vUv;

      void main() {
        float halfPixelX = texel.x * 0.5;
        float halfPixelY = texel.y * 0.5;

        float u = clamp(vUv.x, halfPixelX, 1.0 - halfPixelX);
        float y = clamp(vUv.y, halfPixelY, 1.0 - halfPixelY);

        vec2 colorUv = vec2(u, 0.5 + y * 0.5);
        vec2 alphaUv = vec2(u, y * 0.5);

        vec4 colorSample = texture2D(map, colorUv);
        vec4 alphaSample = texture2D(map, alphaUv);

        gl_FragColor = vec4(colorSample.rgb, alphaSample.r);
      }
    `
  };
}

export function placeholderTexture(
  text,
  bg = '#eceef2',
  fg = '#c05f0e'
) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;

  const context = canvas.getContext('2d');
  context.fillStyle = bg;
  context.fillRect(0, 0, 128, 128);

  const tile = 16;
  const alternate = '#dfe3ea';

  for (let y = 0; y < 128; y += tile) {
    for (let x = 0; x < 128; x += tile) {
      if (((x / tile) + (y / tile)) % 2 === 0) {
        context.fillStyle = alternate;
        context.fillRect(x, y, tile, tile);
      }
    }
  }

  context.fillStyle = 'rgba(255, 255, 255, 0.85)';
  context.fillRect(0, 96, 128, 32);

  context.fillStyle = fg;
  context.font = 'bold 14px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';

  const label = String(text || '').slice(0, 18);
  context.fillText(label, 64, 112);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  if (texture.colorSpace !== undefined) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  return texture;
}

export function hitboxOf(objDef) {
  const source = objDef && objDef.hitbox ? objDef.hitbox : {};
  const type = source.type || 'auto';
  const size = Array.isArray(source.size)
    ? source.size.slice(0, 3)
    : [1, 1, 1];
  const center = Array.isArray(source.center)
    ? source.center.slice(0, 3)
    : [0, 0, 0];

  while (size.length < 3) size.push(1);
  while (center.length < 3) center.push(0);

  return {
    type,
    size,
    center
  };
}