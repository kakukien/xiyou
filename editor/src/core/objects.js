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
  let material;
  if (objDef.material && objDef.material.shader) {
    material = shaderMaterial(objDef.material);
  } else {
    const texture = quadTextureFor(objDef, assets);
    if (texture.colorSpace !== undefined) {
      texture.colorSpace = THREE.SRGBColorSpace;
    }
    material = applyCommonMaterial(new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.DoubleSide
    }), objDef.material);
  }

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.name = objDef.name || 'Quad';
  if (material.userData && material.userData.uniforms) {
    mesh.userData.shaderUniforms = material.userData.uniforms;
  }
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

/* ===== 动画 shader 模板：material.shader = { kind, color1, color2, speed, intensity } ===== */
const SHADER_FRAG_COMMON = `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec3 uColor1;
  uniform vec3 uColor2;
  uniform float uSpeed;
  uniform float uIntensity;
  float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
  float noise(vec2 p){
    vec2 i=floor(p), f=fract(p);
    vec2 u=f*f*(3.0-2.0*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x),u.y);
  }
  float fbm(vec2 p){ float v=0.,a=.5; for(int i=0;i<4;i++){ v+=a*noise(p); p*=2.1; a*=.5; } return v; }
`;
const SHADER_VERT = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`;

const SHADER_KINDS = {
  nebula: `
    vec2 p = vUv - 0.5; float t = uTime * uSpeed * 0.4;
    float n = fbm(p*3.0 + vec2(t, -t*0.7));
    float n2 = fbm(p*6.0 - vec2(t*0.5, t*0.3));
    vec3 col = mix(uColor1, uColor2, n);
    col += uColor2 * n2 * 0.6;
    float edge = smoothstep(0.55, 0.15, length(p));
    gl_FragColor = vec4(col * uIntensity, n * edge);
  `,
  flame: `
    vec2 p = vUv; float t = uTime * uSpeed;
    float n = fbm(vec2(p.x*4.0, p.y*3.0 - t*1.2));
    float body = smoothstep(0.15, 0.75, n - p.y*0.55 + 0.25);
    vec3 col = mix(uColor1, uColor2, p.y + n*0.3);
    gl_FragColor = vec4(col * uIntensity, body * 0.9);
  `,
  sigil: `
    vec2 p = vUv - 0.5; float t = uTime * uSpeed;
    float r = length(p); float a = atan(p.y, p.x);
    float ring1 = smoothstep(0.02, 0.0, abs(r - 0.32 - 0.02*sin(t*2.0)));
    float ring2 = smoothstep(0.015, 0.0, abs(r - 0.2));
    float rays = smoothstep(0.9, 1.0, sin(a*6.0 + t*3.0)) * smoothstep(0.3, 0.05, abs(r-0.26));
    float core = smoothstep(0.12, 0.0, r);
    float glow = ring1 + ring2 + rays*0.7 + core*0.8;
    vec3 col = mix(uColor1, uColor2, r*2.0);
    gl_FragColor = vec4(col * glow * uIntensity, glow);
  `,
  holo: `
    vec2 p = vUv; float t = uTime * uSpeed;
    float scan = 0.75 + 0.25*sin(p.y*80.0 - t*8.0);
    float flick = 0.9 + 0.1*sin(t*23.0);
    float border = max(step(0.97, abs(p.x*2.-1.)), step(0.95, abs(p.y*2.-1.)));
    float body = 0.35 + 0.65*fbm(p*5.0 + t*0.2);
    vec3 col = uColor1 * scan * flick + uColor2 * border;
    gl_FragColor = vec4(col * uIntensity, (body*0.5 + border) * 0.8);
  `,
  ripple: `
    vec2 p = vUv - 0.5; float t = uTime * uSpeed;
    float r = length(p);
    float wave = sin(r*30.0 - t*4.0) * 0.5 + 0.5;
    float fade = smoothstep(0.5, 0.05, r);
    vec3 col = mix(uColor1, uColor2, wave);
    gl_FragColor = vec4(col * uIntensity, wave * fade);
  `
};

function shaderMaterial(mat) {
  const spec = mat && mat.shader ? mat.shader : {};
  const kind = SHADER_KINDS[spec.kind] ? spec.kind : 'sigil';
  const uniforms = {
    uTime: { value: 0 },
    uColor1: { value: new THREE.Color(spec.color1 || spec.color || '#ff8c3b') },
    uColor2: { value: new THREE.Color(spec.color2 || '#5bb6ff') },
    uSpeed: { value: Number(spec.speed) || 1 },
    uIntensity: { value: Number(spec.intensity) || 1.2 }
  };
  const material = new THREE.ShaderMaterial({
    vertexShader: SHADER_VERT,
    fragmentShader: SHADER_FRAG_COMMON + 'void main(){' + SHADER_KINDS[kind] + '}',
    uniforms,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: spec.blend === 'normal' ? THREE.NormalBlending : THREE.AdditiveBlending
  });
  material.userData = { uniforms };
  return material;
}

/* ===== 组装体：parts 基元拼装（AI 实时生成 3D） ===== */
const PART_SHAPES = {
  box:      () => new THREE.BoxGeometry(1, 1, 1),
  sphere:   () => new THREE.SphereGeometry(0.5, 32, 20),
  cylinder: () => new THREE.CylinderGeometry(0.5, 0.5, 1, 24),
  cone:     () => new THREE.ConeGeometry(0.5, 1, 24),
  torus:    () => new THREE.TorusGeometry(0.5, 0.12, 12, 40),
  icosa:    () => new THREE.IcosahedronGeometry(0.5, 0),
  octa:     () => new THREE.OctahedronGeometry(0.5, 0),
  tetra:    () => new THREE.TetrahedronGeometry(0.5, 0),
  capsule:  () => new THREE.CapsuleGeometry(0.3, 0.5, 6, 16),
  plane:    () => new THREE.PlaneGeometry(1, 1),
  ring:     () => new THREE.RingGeometry(0.32, 0.5, 48)
};

function createCompound(objDef) {
  const group = new THREE.Group();
  group.name = objDef.name || 'Compound';
  const parts = Array.isArray(objDef.parts) ? objDef.parts : [];

  parts.slice(0, 64).forEach(part => {
    if (!part || typeof part !== 'object') return;
    const geomFn = PART_SHAPES[part.shape] || PART_SHAPES.box;
    const useStd = !part.flat && part.blend !== 'additive' && !part.shader;
    const matSpec = part.material || part;
    const params = {
      color: new THREE.Color(matSpec.color || '#e8e4dc'),
      transparent: (matSpec.opacity ?? 1) < 1 || matSpec.blend === 'additive',
      opacity: matSpec.opacity ?? 1,
      side: THREE.DoubleSide
    };
    let material;
    if (part.shader) {
      material = shaderMaterial(matSpec);
    } else if (useStd) {
      material = new THREE.MeshStandardMaterial({
        ...params,
        roughness: matSpec.roughness ?? 0.7,
        metalness: matSpec.metalness ?? 0.15,
        emissive: new THREE.Color(matSpec.emissive || '#000000'),
        emissiveIntensity: matSpec.emissive ? (matSpec.emissive_intensity ?? 1) : 0
      });
    } else {
      material = new THREE.MeshBasicMaterial(params);
      if (matSpec.blend === 'additive') {
        material.blending = THREE.AdditiveBlending;
        material.depthWrite = false;
      }
    }
    const mesh = new THREE.Mesh(geomFn(), material);
    if (material.userData && material.userData.uniforms) {
      mesh.userData.shaderUniforms = material.userData.uniforms;
    }
    const p = part.p || [0, 0, 0];
    const r = part.r || [0, 0, 0];
    const s = part.s || [1, 1, 1];
    mesh.position.set(p[0] || 0, p[1] || 0, p[2] || 0);
    mesh.rotation.set((r[0] || 0) * Math.PI / 180, (r[1] || 0) * Math.PI / 180, (r[2] || 0) * Math.PI / 180);
    mesh.scale.set(s[0] || 1, s[1] || 1, s[2] || 1);
    group.add(mesh);
  });

  if (!parts.length) {
    group.add(new THREE.Mesh(
      new THREE.OctahedronGeometry(0.5, 0),
      new THREE.MeshStandardMaterial({ color: 0xe68a2e, roughness: 0.5, metalness: 0.3 })
    ));
  }
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
  } else if (type === 'compound') {
    node = createCompound(objDef);
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