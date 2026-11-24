import * as THREE from 'three';

// Pool water: a lit, transparent surface with gentle waves, caustics, a bright rim at the walls,
// ripple rings from up to MAX_RIPPLES sources and a foam wake around each swimming kid.
// Also a tile material for the basin that shows moving caustics below the waterline.

export const MAX_RIPPLES = 32;

const NOISE = /* glsl */ `
vec2 poolHash(vec2 p) {
  p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
  return fract(sin(p) * 43758.5453);
}
float poolCells(vec2 p, float t) {
  vec2 g = floor(p);
  vec2 f = fract(p);
  float d1 = 8.0;
  float d2 = 8.0;
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 h = poolHash(g + o);
      vec2 r = o + 0.5 + 0.4 * sin(t + 6.2831 * h) - f;
      float d = dot(r, r);
      if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
    }
  }
  return sqrt(d2) - sqrt(d1);
}
float poolCaustic(vec2 p, float t) {
  float a = poolCells(p * 1.15, t * 0.8);
  float b = poolCells(p * 1.7 + vec2(3.1, 7.7), 1.3 - t * 0.65);
  return (1.0 - smoothstep(0.0, 0.16, a)) * 0.75 + (1.0 - smoothstep(0.0, 0.12, b)) * 0.5;
}
`;

const WAVES = /* glsl */ `
uniform float uTime;
uniform vec4 uRip[${MAX_RIPPLES}];
uniform vec2 uHalf;
// Height and slope of the surface at p (pool-local metres): vec3(h, dh/dx, dh/dz). foam: splash crests.
vec3 poolWaves(vec2 p, float t, out float foam, out float crest) {
  float h = 0.0;
  vec2 g = vec2(0.0);
  foam = 0.0;
  crest = 0.0;
  float a1 = p.x * 0.9 + p.y * 0.35 + t * 1.1;
  h += 0.016 * sin(a1); g += 0.016 * cos(a1) * vec2(0.9, 0.35);
  float a2 = -p.x * 0.4 + p.y * 1.3 + t * 1.45;
  h += 0.012 * sin(a2); g += 0.012 * cos(a2) * vec2(-0.4, 1.3);
  float a3 = p.x * 2.3 + p.y * 1.9 - t * 2.1;
  h += 0.005 * sin(a3); g += 0.005 * cos(a3) * vec2(2.3, 1.9);
  for (int i = 0; i < ${MAX_RIPPLES}; i++) {
    vec4 r = uRip[i];
    float age = t - r.z;
    if (r.w <= 0.0 || age < 0.0 || age > 4.0) continue;
    vec2 dv = p - r.xy;
    float d = length(dv) + 1e-4;
    float rad = 0.3 + age * 1.3;
    float w = 0.2 + age * 0.14;
    float x = (d - rad) / w;
    if (abs(x) > 3.0) continue;
    float env = r.w * exp(-age * 1.2) * exp(-x * x);
    float k = 8.5;
    float c = cos((d - rad) * k);
    float s = sin((d - rad) * k);
    h += env * c * 0.05;
    g += env * ((-2.0 * x / w) * c - k * s) * 0.05 * dv / d;
    foam += smoothstep(0.35, 1.4, env) * (0.6 + 0.4 * c);
    foam += smoothstep(1.4, 3.0, r.w) * exp(-age * 2.4) * exp(-d * d / (0.25 + age * 0.8)) * 1.2;
    crest += env * max(c, 0.0) * smoothstep(-1.0, 1.0, s);
  }
  return vec3(h, g);
}
`;

// colors: { shallow, mid, deep } hex. zones: x of the kids-area edge and the start/end of the deep slope (pool-local).
export function makeWaterMaterial({ half, colors, zones }) {
  const uniforms = {
    uTime: { value: 0 },
    uRip: { value: Array.from({ length: MAX_RIPPLES }, () => new THREE.Vector4(0, 0, -99, 0)) },
    uHalf: { value: new THREE.Vector2(half.x, half.z) },
    uKid: { value: [new THREE.Vector4(), new THREE.Vector4()] },
    uKidDir: { value: new THREE.Vector4(0, 1, 0, 1) },
    uShallow: { value: new THREE.Color(colors.shallow) },
    uMid: { value: new THREE.Color(colors.mid) },
    uDeep: { value: new THREE.Color(colors.deep) },
    uZones: { value: new THREE.Vector3(zones.kids, zones.slope0, zones.slope1) },
  };
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.08, metalness: 0, transparent: true, opacity: 1 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>\n${WAVES}\nvarying vec2 vPool;`)
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
  vPool = position.xz;
  vec2 pe = uHalf - abs(position.xz);
  float vfoam;
  float vcrest;
  transformed.y += poolWaves(position.xz, uTime, vfoam, vcrest).x * smoothstep(0.0, 0.35, min(pe.x, pe.y));`,
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
${NOISE}
${WAVES}
varying vec2 vPool;
uniform vec4 uKid[2];
uniform vec4 uKidDir;
uniform vec3 uShallow;
uniform vec3 uMid;
uniform vec3 uDeep;
uniform vec3 uZones;`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
  float wFoam;
  float wCrest;
  vec3 wv = poolWaves(vPool, uTime, wFoam, wCrest);
  wCrest = clamp(wCrest, 0.0, 1.0);
  vec2 fine = vec2(sin(vPool.x * 6.0 + uTime * 2.6 + sin(vPool.y * 4.0)), cos(vPool.y * 7.0 - uTime * 2.2 + sin(vPool.x * 3.0))) * 0.06;
  vec3 wN = normalize(vec3(-(wv.y + fine.x), 1.0, -(wv.z + fine.y)));
  // Foam around swimmers and a V wake behind them
  for (int i = 0; i < 2; i++) {
    vec4 kd = uKid[i];
    if (kd.w < 0.5) continue;
    vec2 dir = i == 0 ? uKidDir.xy : uKidDir.zw;
    vec2 q = vPool - kd.xy;
    float d = length(q);
    float spd = clamp(kd.z / 2.2, 0.0, 1.0);
    float hug = 0.33 + 0.03 * sin(uTime * 5.0 + float(i) * 2.0);
    wFoam += exp(-pow((d - hug) / 0.075, 2.0)) * (0.55 + spd * 0.45) * kd.w;
    float along = dot(q, -dir);
    float side = dot(q, vec2(-dir.y, dir.x));
    float vw = exp(-pow((abs(side) - along * 0.36) / (0.045 + along * 0.035), 2.0)) * exp(-along * 0.75) * smoothstep(0.15, 0.55, along);
    float streak = exp(-side * side / (0.012 + along * 0.02)) * exp(-along * 1.4) * smoothstep(0.05, 0.4, along);
    wFoam += (vw * 0.9 + streak * 0.5) * spd;
  }
  // Bright lapping rim along the walls
  vec2 pe2 = uHalf - abs(vPool);
  float edge = min(pe2.x, pe2.y);
  float lap = 0.5 + 0.5 * sin(uTime * 1.8 + (vPool.x - vPool.y) * 2.6);
  float rim = 1.0 - smoothstep(0.02, 0.22 + lap * 0.1, edge);
  wFoam += rim * (0.62 + 0.3 * lap);
  float glow = exp(-edge * 3.2);
  // Colour by depth: kids area, main pool, deep end
  float zMid = smoothstep(uZones.x - 0.3, uZones.x + 0.3, vPool.x);
  float zDeep = smoothstep(uZones.y, uZones.z, vPool.x);
  vec3 wCol = mix(uShallow, uMid, zMid);
  wCol = mix(wCol, uDeep, zDeep);
  float caus = poolCaustic(vPool * 1.25 + wN.xz * 0.8, uTime);
  wCol = mix(wCol, vec3(0.86, 0.98, 1.0), glow * 0.45);
  float foamK = clamp(wFoam, 0.0, 1.0);
  diffuseColor.rgb = mix(wCol, vec3(1.0), max(foamK * 0.85, wCrest * 0.45));
  diffuseColor.a = clamp(mix(0.34, 0.74, zMid * 0.12 + zDeep * 0.88) + foamK * 0.5 + wCrest * 0.25 + glow * 0.1, 0.0, 0.96);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
  normal = normalize((viewMatrix * vec4(wN, 0.0)).xyz);`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
  totalEmissiveRadiance += vec3(0.55, 0.85, 0.95) * caus * 0.14 + vec3(1.0) * foamK * 0.22 + vec3(0.75, 0.97, 1.0) * wCrest * 0.35 + vec3(0.5, 0.9, 1.0) * glow * 0.12;`,
      );
  };
  m.customProgramCacheKey = () => 'roji-pool-water';
  m.userData.uniforms = uniforms;
  return m;
}

// Tile material whose fragments below the waterline get blue light and moving caustics.
export function makeBasinMaterial(map, time, waterY, glow = 0) {
  const m = new THREE.MeshStandardMaterial({ map, roughness: 0.35, metalness: 0 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCW;')
      .replace('#include <project_vertex>', '#include <project_vertex>\nvCW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nuniform float uTime;\nvarying vec3 vCW;\n${NOISE}`)
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
  float under = smoothstep(${(waterY + 0.02).toFixed(3)}, ${(waterY - 0.2).toFixed(3)}, vCW.y);
  float cc = poolCaustic(vCW.xz * 0.95 + vec2(vCW.y * 0.6), uTime);
  diffuseColor.rgb *= mix(vec3(1.0), vec3(0.74, 0.92, 1.0), under);
  totalEmissiveRadiance += vec3(0.7, 0.95, 1.0) * cc * under * 0.38 + diffuseColor.rgb * ${glow.toFixed(2)};`,
      );
  };
  m.customProgramCacheKey = () => 'roji-pool-basin' + glow;
  return m;
}

// CPU copy of the ripple height, so floats bob on the same rings the shader draws.
export function rippleHeight(rips, x, z, t) {
  let h = 0.016 * Math.sin(x * 0.9 + z * 0.35 + t * 1.1) + 0.012 * Math.sin(-x * 0.4 + z * 1.3 + t * 1.45);
  for (const r of rips) {
    const age = t - r.z;
    if (r.w <= 0 || age < 0 || age > 4) continue;
    const d = Math.hypot(x - r.x, z - r.y);
    const rad = 0.3 + age * 1.3;
    const w = 0.2 + age * 0.14;
    const q = (d - rad) / w;
    if (Math.abs(q) > 3) continue;
    h += r.w * Math.exp(-age * 1.2) * Math.exp(-q * q) * Math.cos((d - rad) * 8.5) * 0.05;
  }
  return h;
}
