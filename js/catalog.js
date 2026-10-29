// Shop items. Prices in cents. Cheap items first so early wins come fast.
export const SLOTS = [
  { id: 'hat',     name: 'Hats' },
  { id: 'glasses', name: 'Glasses' },
  { id: 'shirt',   name: 'Shirts' },
  { id: 'back',    name: 'Backpacks' },
  { id: 'pet',     name: 'Pets' },
];

export const ITEMS = [
  { id: 'shirt_pink',    slot: 'shirt',   price: 40,  name: 'Bubblegum Shirt', color: '#ff6fb5' },
  { id: 'shirt_purple',  slot: 'shirt',   price: 40,  name: 'Grape Shirt',     color: '#9b6bff' },
  { id: 'shirt_teal',    slot: 'shirt',   price: 45,  name: 'Ocean Shirt',     color: '#1fc8c8' },
  { id: 'shirt_lime',    slot: 'shirt',   price: 50,  name: 'Slime Shirt',     color: '#9be22d' },
  { id: 'shirt_rainbow', slot: 'shirt',   price: 175, name: 'Rainbow Shirt',   color: 'rainbow' },
  { id: 'hat_party',     slot: 'hat',     price: 50,  name: 'Party Hat',       icon: '🎉' },
  { id: 'hat_cap',       slot: 'hat',     price: 75,  name: 'Ball Cap',        icon: '🧢' },
  { id: 'hat_cone',      slot: 'hat',     price: 85,  name: 'Traffic Cone',    icon: '🚧' },
  { id: 'hat_bunny',     slot: 'hat',     price: 90,  name: 'Bunny Ears',      icon: '🐰' },
  { id: 'hat_top',       slot: 'hat',     price: 125, name: 'Fancy Top Hat',   icon: '🎩' },
  { id: 'hat_cowboy',    slot: 'hat',     price: 150, name: 'Cowgirl Hat',     icon: '🤠' },
  { id: 'hat_crown',     slot: 'hat',     price: 200, name: 'Royal Crown',     icon: '👑' },
  { id: 'glasses_sun',   slot: 'glasses', price: 60,  name: 'Cool Shades',     icon: '😎' },
  { id: 'glasses_heart', slot: 'glasses', price: 95,  name: 'Heart Glasses',   icon: '💖' },
  { id: 'glasses_star',  slot: 'glasses', price: 110, name: 'Star Shades',     icon: '🌟' },
  { id: 'back_bamboo',   slot: 'back',    price: 130, name: 'Bamboo Backpack', icon: '🎋' },
  { id: 'back_jet',      slot: 'back',    price: 300, name: 'Jetpack',         icon: '🚀' },
  { id: 'pet_baby',      slot: 'pet',     price: 400, name: 'Baby Panda Pet',  icon: '🐼' },
];

export const item = (id) => ITEMS.find((i) => i.id === id);
