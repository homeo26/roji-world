import * as THREE from 'three';

// Lazy access to the shared 3D props (food and gifts), with a plain stand-in while they don't exist.
//   await props.food('mansaf')        -> Object3D, base at y = 0, about 0.25 to 0.5 m across
//   await props.gift('necklace')      -> Object3D, the gift that comes out of a box
//   await props.giftBox('#ef5b6f')    -> { root, lid, open(k) } a wrapped box; open(0..1) lifts the lid
//   await props.list('food' | 'gift') -> [{ id, name, line }]

function standIn(color) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.3), new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
  m.position.y = 0.1;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

export function loadProps() {
  let food = null;
  let gifts = null;
  const getFood = async () => (food ??= await import('../props/food.js').catch(() => false));
  const getGifts = async () => (gifts ??= await import('../props/gifts.js').catch(() => false));
  return {
    async food(id) {
      const m = await getFood();
      return m ? m.makeFood(id) : standIn('#f4a261');
    },
    async gift(id) {
      const m = await getGifts();
      return m ? m.makeGift(id) : standIn('#ffd166');
    },
    async giftBox(color = '#ef5b6f', ribbon = '#ffd166') {
      const m = await getGifts();
      if (m) return m.makeGiftBox(color, ribbon);
      const root = standIn(color);
      const lid = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.06, 0.33), new THREE.MeshStandardMaterial({ color: ribbon }));
      lid.position.y = 0.23;
      root.add(lid);
      return { root, lid, open: (k) => (lid.position.y = 0.23 + k * 0.4) };
    },
    async list(kind) {
      const m = kind === 'food' ? await getFood() : await getGifts();
      if (!m) return [];
      return kind === 'food' ? m.FOODS : m.GIFTS;
    },
  };
}
