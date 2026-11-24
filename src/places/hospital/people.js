import * as THREE from 'three';
import { mat, mesh } from '../../util.js';
import { colorBake } from './models.js';

// Patients and staff of Sunny Hill: a Kid with a few extras (glasses, a moustache, grown-up size).

const HC = new THREE.Vector3(0, 0.29, 0); // head centre inside kid.head (see src/kid.js)

// Add face extras to the kid's head. Call again after kid.setLook(), which rebuilds the body.
export function dress(kid, p) {
  const H = kid.head;
  if (p.glasses) {
    const frame = mat('#6b4f7a', { rough: 0.4 });
    const ringGeo = new THREE.TorusGeometry(0.066, 0.012, 6, 20);
    for (const s of [1, -1]) {
      const ring = mesh(ringGeo, frame, { cast: false });
      ring.position.set(HC.x + 0.108 * s, HC.y - 0.02, HC.z + 0.3);
      H.add(ring);
    }
    const bridge = mesh(new THREE.BoxGeometry(0.08, 0.014, 0.014), frame, { cast: false });
    bridge.position.set(HC.x, HC.y - 0.005, HC.z + 0.305);
    H.add(bridge);
  }
  if (p.moustache) {
    const m = mesh(new THREE.CapsuleGeometry(0.022, 0.07, 3, 8), mat(p.look.hair, { rough: 0.6 }), { cast: false });
    m.rotation.z = Math.PI / 2;
    m.position.set(HC.x, HC.y - 0.075, HC.z + 0.29);
    H.add(m);
  }
}

// makeKid: ctx.makeKid. look: optional override of p.look (a sick or a healthy colour).
export function makePerson(makeKid, p, look = p.look) {
  const kid = makeKid({ id: p.id, ...look });
  dress(kid, p);
  if (p.grown) kid.root.scale.setScalar(1.14);
  return kid;
}

// Freeze a kid in its current pose so it merges with the room (a patient in bed, a kid waiting).
// The curved parts get fewer segments (frozen people are seen from the room camera only).
// keep: parts that stay separate and movable (for example an arm that waves). Returns the kid.
export function freeze(kid, { pose = 'sit', hands = null, keep = [] } = {}) {
  kid.pose = pose;
  kid.hands = hands;
  kid.update(1 / 60, 0, 0, 0, 0);
  kid.blob.visible = pose === 'stand';
  simplify(kid);
  if (keep.length) colorBake(kid.root, keep);
  return kid;
}

function simplify(kid) {
  const half = (n, min) => Math.max(min, Math.round(n * 0.5));
  const skin = new THREE.Color(kid.look.skin);
  kid.root.traverse((o) => {
    if (!o.isMesh) return;
    // Blush circles become solid so they merge too
    if (o.material.isMeshBasicMaterial && o.parent === kid.head) {
      const c = skin.clone().lerp(o.material.color, o.material.opacity);
      o.material.dispose();
      o.material = mat('#' + c.getHexString(), { rough: 0.6 });
    }
    const g = o.geometry;
    const p = g.parameters;
    let next = null;
    if (g.type === 'SphereGeometry') next = new THREE.SphereGeometry(p.radius, half(p.widthSegments, 8), half(p.heightSegments, 6), p.phiStart, p.phiLength, p.thetaStart, p.thetaLength);
    else if (g.type === 'LatheGeometry') next = new THREE.LatheGeometry(p.points, half(p.segments, 10), p.phiStart, p.phiLength);
    else if (g.type === 'TorusGeometry') next = new THREE.TorusGeometry(p.radius, p.tube, half(p.radialSegments, 4), half(p.tubularSegments, 8), p.arc);
    else if (g.type === 'CapsuleGeometry') next = new THREE.CapsuleGeometry(p.radius, p.height, 2, half(p.radialSegments, 6));
    if (!next) return;
    g.dispose();
    o.geometry = next;
  });
}
