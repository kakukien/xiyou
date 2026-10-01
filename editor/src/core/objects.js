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

function createQuad(objDef, assets) {
  const asset = assetFor(objDef, assets);
  const texture = asset && asset.url
    ? new THREE.TextureLoader().load(asset.url)
    : placeholderTexture(objDef.name || 'QUAD');

  if (texture.colorSpace !== undefined) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: materialValue(objDef.material, 'opacity', 1)
  });

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), material);
  mesh.name = objDef.name || 'Quad';
  return mesh;
}

function createVideoQuad(objDef, assets) {
  const asset = assetFor(objDef, assets);
  const preset = objDef.material && VIDEO_PRESETS[objDef.material.preset]
    ? VIDEO_PRESETS[objDef.material.preset]
    : null;
  const aspect = preset ? (preset.w * 2) / preset.h : 0.75;

  const uniforms = stackedAlphaShader().uniforms;
  let video = null;

  if (asset && asset.url) {
    video = document.createElement('video');
    video.src = asset.url;
    video.loop = true;
    video.muted = true;
    video.playsInline = true;
    video.setAttribute('playsinline', '');
    video.preload = 'auto';

    const texture = new THREE.VideoTexture(video);
    texture.colorSpace = THREE.SRGBColorSpace;
    uniforms.map.value = texture;
    uniforms.texel.value.set(1 / 2048, 1 / 2048);
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
      color: 0xe68a2e,
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

  if (asset && asset.url) {
    const loader = new GLTFLoader();
    loader.load(
      asset.url,
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

  const points = new THREE.Points(
    geometry,
    new THREE.PointsMaterial({
      size: 0.02,
      color: 0x7fd4c1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.9
    })
  );
  group.add(points);

  const shell = new THREE.Mesh(
    new THREE.SphereGeometry(1, 24, 16),
    new THREE.MeshBasicMaterial({
      color: 0x7fd4c1,
      transparent: true,
      opacity: 0.08,
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