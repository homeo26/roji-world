// Little hand-held things for moments with people: a phone for selfies, Roji's stethoscope,
// and the shared flowers and latte props (scaled for one hand).

export function makeModels(THREE, util, props) {
  const { mat, mesh } = util;
  const pink = mat('#ff8fb1', { rough: 0.5 });
  const screen = mat('#2b2140', { rough: 0.25, emissive: '#7fb6ff', ei: 0.35 });
  const steel = mat('#d9dee8', { metal: 0.6, rough: 0.3 });
  const tube = mat('#3f7bf0', { rough: 0.5 });
  const phoneGeo = new THREE.BoxGeometry(0.075, 0.13, 0.014);
  const screenGeo = new THREE.PlaneGeometry(0.062, 0.112);
  return {
    // Held in the right hand (child of kid.arms[1]), screen toward the kid
    phone() {
      const g = new THREE.Group();
      const body = mesh(phoneGeo, pink, { cast: false });
      const sc = mesh(screenGeo, screen, { cast: false, receive: false });
      sc.position.z = -0.008;
      sc.rotation.y = Math.PI;
      g.add(body, sc);
      g.position.set(0, -0.36, 0.02);
      g.rotation.set(0.25, 0, 0);
      return g;
    },
    stethoscope() {
      const g = new THREE.Group();
      const head = mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.018, 14), steel, { cast: false });
      head.rotation.x = Math.PI / 2;
      head.position.set(0, -0.34, 0.02);
      const t = mesh(new THREE.TorusGeometry(0.05, 0.008, 6, 14, Math.PI * 1.2), tube, { cast: false });
      t.position.set(0, -0.29, 0.02);
      t.rotation.z = Math.PI * 0.9;
      g.add(head, t);
      return g;
    },
    async flowers() {
      const f = await props.gift('flowers');
      f.scale.setScalar(0.62);
      f.position.set(0, -0.05, 0.02);
      return f;
    },
    async latte() {
      const c = await props.food('spanish-latte');
      c.scale.setScalar(0.7);
      c.position.set(0, -0.02, 0.02);
      return c;
    },
  };
}
