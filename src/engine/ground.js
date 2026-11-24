import * as THREE from 'three';

// Lets places cut holes in the ground (a sunken pool) and paint areas of it (snow, a sand pitch).
// decorateGround(materials) patches each material's shader. Returns { addHole, addTint }.
// Coordinates are world metres. Up to 16 holes and 40 tints.

const MAX_HOLES = 16;
const MAX_TINTS = 40;

export function decorateGround(materials) {
  const uniforms = {
    uHoles: { value: Array.from({ length: MAX_HOLES }, () => new THREE.Vector4(0, 0, -1, -1)) },
    uHoleCount: { value: 0 },
    uTints: { value: Array.from({ length: MAX_TINTS }, () => new THREE.Vector4()) },
    uTintCol: { value: Array.from({ length: MAX_TINTS }, () => new THREE.Vector4()) },
    uTintCount: { value: 0 },
  };
  for (const m of materials) {
    m.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, uniforms);
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vGroundW;')
        .replace('#include <project_vertex>', '#include <project_vertex>\nvGroundW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace(
          '#include <common>',
          `#include <common>
varying vec3 vGroundW;
uniform vec4 uHoles[${MAX_HOLES}];
uniform int uHoleCount;
uniform vec4 uTints[${MAX_TINTS}];
uniform vec4 uTintCol[${MAX_TINTS}];
uniform int uTintCount;
float groundBox(vec2 p, vec2 b) { vec2 d = abs(p) - b; return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0); }`,
        )
        .replace(
          'void main() {',
          `void main() {
  for (int i = 0; i < ${MAX_HOLES}; i++) {
    if (i >= uHoleCount) break;
    vec4 h = uHoles[i];
    if (vGroundW.x > h.x && vGroundW.x < h.z && vGroundW.z > h.y && vGroundW.z < h.w) discard;
  }`,
        )
        .replace(
          '#include <map_fragment>',
          `#include <map_fragment>
  for (int i = 0; i < ${MAX_TINTS}; i++) {
    if (i >= uTintCount) break;
    vec4 tb = uTints[i];
    vec4 tc = uTintCol[i];
    float sd = groundBox(vGroundW.xz - tb.xy, tb.zw);
    float w = 1.0 - smoothstep(0.0, max(tc.w, 0.01), sd);
    diffuseColor.rgb = mix(diffuseColor.rgb, tc.rgb, w);
  }`,
        );
    };
    m.needsUpdate = true;
  }
  const c = new THREE.Color();
  return {
    // Axis-aligned hole: centre (x, z) and half sizes.
    addHole(x, z, hw, hd) {
      const n = uniforms.uHoleCount.value;
      if (n >= MAX_HOLES) return console.warn('ground: too many holes');
      uniforms.uHoles.value[n].set(x - hw, z - hd, x + hw, z + hd);
      uniforms.uHoleCount.value = n + 1;
    },
    // Paint a rounded area: centre, half sizes, colour, and how far (metres) it fades out.
    addTint(x, z, hw, hd, color, feather = 2) {
      const n = uniforms.uTintCount.value;
      if (n >= MAX_TINTS) return console.warn('ground: too many tints');
      c.set(color); // hex is sRGB; THREE.Color stores the linear working colour
      uniforms.uTints.value[n].set(x, z, hw, hd);
      uniforms.uTintCol.value[n].set(c.r, c.g, c.b, feather);
      uniforms.uTintCount.value = n + 1;
    },
  };
}
