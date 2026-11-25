import type { Category, Combo, MenuItem, RestaurantSettings } from './types'

export const defaultSettings: RestaurantSettings = {
  name: 'AAROHA VANAM',
  tagline: 'Where Nature Meets Flavor',
  logo: '/assets/aaroha-vanam-logo.svg',
  phone: '',
  address: 'Madanapalle',
  openingHours: '',
  gstPercent: 5,
  extraCharge: 0,
  tables: Array.from({ length: 20 }, (_, i) => `T${String(i + 1).padStart(2, '0')}`),
  open: true,
}

export const defaultCategories: Category[] = [
  { id: 'todays-specials', name: "Today's Specials", active: true, order: 1 },
  { id: 'best-sellers', name: 'Best Sellers', active: true, order: 2 },
  { id: 'breakfast', name: 'Breakfast', active: true, order: 3 },
  { id: 'starters', name: 'Starters', active: true, order: 4 },
  { id: 'soups', name: 'Soups', active: true, order: 5 },
  { id: 'vegetarian', name: 'Vegetarian', active: true, order: 6 },
  { id: 'non-vegetarian', name: 'Non-Vegetarian', active: true, order: 7 },
  { id: 'biryani-rice', name: 'Biryani & Rice', active: true, order: 8 },
  { id: 'chinese', name: 'Chinese', active: true, order: 9 },
  { id: 'tandoori', name: 'Tandoori', active: true, order: 10 },
  { id: 'indian-breads', name: 'Indian Breads', active: true, order: 11 },
  { id: 'combos-meal-deals', name: 'Combos & Meal Deals', active: true, order: 12 },
  { id: 'beverages', name: 'Beverages', active: true, order: 13 },
  { id: 'desserts', name: 'Desserts', active: true, order: 14 },
]

const product = (id: string, name: string, description: string, price: number, categoryId: string, type: 'veg' | 'nonveg', image: string, extra: Partial<MenuItem> = {}): MenuItem => ({ id, name, description, price, categoryId, type, image, available: true, ...extra })

export const defaultMenu: MenuItem[] = [
  product('idli', 'Idli', 'Soft steamed rice cakes with chutneys and sambar.', 40, 'breakfast', 'veg', '/assets/food/idli.jpg', { bestseller: true }),
  product('masala-dosa', 'Masala Dosa', 'Golden crisp dosa with a gently spiced potato filling.', 80, 'breakfast', 'veg', '/assets/food/masala-dosa.jpg', { bestseller: true }),
  product('upma', 'Vegetable Upma', 'Toasted semolina with vegetables, curry leaves and cashews.', 70, 'breakfast', 'veg', '/assets/food/placeholder-breakfast.svg'),
  product('chicken-65', 'Chicken 65', 'Crisp, spice-tossed chicken with curry leaves.', 200, 'starters', 'nonveg', '/assets/food/chicken-65.jpg', { bestseller: true, special: true }),
  product('paneer-65', 'Paneer 65', 'Golden paneer bites with a tangy South Indian finish.', 170, 'starters', 'veg', '/assets/food/paneer-65.jpg'),
  product('gobi-manchurian', 'Gobi Manchurian', 'Crisp cauliflower in a savoury Indo-Chinese glaze.', 140, 'starters', 'veg', '/assets/food/gobi-manchurian.jpg', { bestseller: true }),
  product('veg-spring-rolls', 'Vegetable Spring Rolls', 'Crunchy rolls filled with seasoned vegetables.', 150, 'starters', 'veg', '/assets/food/placeholder-starters.svg'),
  product('tomato-soup', 'Cream of Tomato Soup', 'Slow-simmered tomato soup with a touch of cream.', 110, 'soups', 'veg', '/assets/food/placeholder-soups.svg'),
  product('sweet-corn-soup', 'Sweet Corn Soup', 'A comforting bowl with sweet corn and spring onion.', 120, 'soups', 'veg', '/assets/food/placeholder-soups.svg'),
  product('paneer-butter-masala', 'Paneer Butter Masala', 'Paneer in a silky tomato, butter and cream gravy.', 190, 'vegetarian', 'veg', '/assets/food/paneer-butter-masala.jpg', { bestseller: true, special: true }),
  product('kaju-curry', 'Kaju Curry', 'Cashews in a rich, warmly spiced curry.', 220, 'vegetarian', 'veg', '/assets/food/kaju-curry.jpg'),
  product('dal-tadka', 'Dal Tadka', 'Yellow lentils finished with cumin, garlic and ghee.', 150, 'vegetarian', 'veg', '/assets/food/placeholder-vegetarian.svg'),
  product('chicken-curry', 'Andhra Chicken Curry', 'Chicken simmered in a bold, homestyle spice gravy.', 240, 'non-vegetarian', 'nonveg', '/assets/food/placeholder-nonveg.svg', { special: true }),
  product('butter-chicken', 'Butter Chicken', 'Tandoor-kissed chicken in a smooth tomato gravy.', 260, 'non-vegetarian', 'nonveg', '/assets/food/placeholder-nonveg.svg', { bestseller: true }),
  product('chicken-biryani', 'Chicken Biryani', 'Fragrant dum-cooked basmati rice with spiced chicken.', 220, 'biryani-rice', 'nonveg', '/assets/food/chicken-biryani.jpg', { bestseller: true, special: true, keywords: ['dum', 'hyderabadi'] }),
  product('mutton-biryani', 'Mutton Biryani', 'Aromatic basmati layered with slow-cooked mutton.', 280, 'biryani-rice', 'nonveg', '/assets/food/placeholder-biryani.svg'),
  product('veg-biryani', 'Veg Biryani', 'Basmati rice layered with vegetables and whole spices.', 160, 'biryani-rice', 'veg', '/assets/food/veg-biryani.jpg', { bestseller: true }),
  product('egg-biryani', 'Egg Biryani', 'Spiced basmati served with boiled egg and raita.', 180, 'biryani-rice', 'nonveg', '/assets/food/placeholder-biryani.svg'),
  product('chicken-fried-rice', 'Chicken Fried Rice', 'Wok-tossed rice with vegetables, egg and chicken.', 180, 'chinese', 'nonveg', '/assets/food/placeholder-chinese.svg'),
  product('veg-fried-rice', 'Veg Fried Rice', 'Wok-tossed rice with crisp vegetables and spring onion.', 140, 'chinese', 'veg', '/assets/food/placeholder-chinese.svg'),
  product('chicken-noodles', 'Chicken Noodles', 'Wok-fried noodles with chicken and seasonal vegetables.', 180, 'chinese', 'nonveg', '/assets/food/placeholder-chinese.svg'),
  product('tandoori-chicken', 'Tandoori Chicken', 'Yogurt-marinated chicken roasted with aromatic spices.', 290, 'tandoori', 'nonveg', '/assets/food/placeholder-tandoori.svg', { bestseller: true }),
  product('paneer-tikka', 'Paneer Tikka', 'Chargrilled paneer with peppers and house spices.', 210, 'tandoori', 'veg', '/assets/food/placeholder-tandoori.svg'),
  product('butter-naan', 'Butter Naan', 'Soft tandoor-baked naan brushed with butter.', 40, 'indian-breads', 'veg', '/assets/food/butter-naan.jpg'),
  product('tandoori-roti', 'Tandoori Roti', 'Whole-wheat flatbread baked in a traditional tandoor.', 25, 'indian-breads', 'veg', '/assets/food/placeholder-indian-breads.svg'),
  product('fresh-lime-soda', 'Fresh Lime Soda', 'Fresh lime, soda and a hint of sweetness.', 60, 'beverages', 'veg', '/assets/food/placeholder-beverages.svg'),
  product('sweet-lassi', 'Sweet Lassi', 'Chilled, creamy yogurt drink with a light cardamom note.', 80, 'beverages', 'veg', '/assets/food/sweet-lassi.jpg'),
  product('masala-chai', 'Masala Chai', 'Indian tea simmered with milk and warming spices.', 35, 'beverages', 'veg', '/assets/food/placeholder-beverages.svg'),
  product('gulab-jamun', 'Gulab Jamun', 'Warm milk-solid dumplings in fragrant sugar syrup.', 70, 'desserts', 'veg', '/assets/food/gulab-jamun.jpg', { bestseller: true }),
  product('ice-cream', 'Ice Cream', 'A scoop of chilled seasonal ice cream.', 80, 'desserts', 'veg', '/assets/food/ice-cream.jpg'),
]

export const defaultCombos: Combo[] = [
  { id: 'royal-chicken-combo', name: 'Royal Chicken Combo', description: 'Chicken Biryani · Chicken 65 · Soft Drink', includedItems: [{ itemId: 'chicken-biryani', name: 'Chicken Biryani', quantity: 1 }, { itemId: 'chicken-65', name: 'Chicken 65', quantity: 1 }, { itemId: 'soft-drink', name: 'Soft Drink', quantity: 1 }], price: 299, originalPrice: 360, image: '/assets/food/placeholder-chicken-combo.svg', active: true },
  { id: 'royal-veg-combo', name: 'Royal Veg Combo', description: 'Veg Biryani · Paneer Starter · Soft Drink', includedItems: [{ itemId: 'veg-biryani', name: 'Veg Biryani', quantity: 1 }, { itemId: 'paneer-65', name: 'Paneer 65', quantity: 1 }, { itemId: 'soft-drink', name: 'Soft Drink', quantity: 1 }], price: 249, originalPrice: 300, image: '/assets/food/placeholder-veg-combo.svg', active: true },
  { id: 'family-feast', name: 'Family Feast', description: '2 Chicken Biryanis · 2 Starters · 2 Soft Drinks', includedItems: [{ itemId: 'chicken-biryani', name: 'Chicken Biryani', quantity: 2 }, { itemId: 'chicken-65', name: 'Starter selection', quantity: 2 }, { itemId: 'soft-drink', name: 'Soft Drink', quantity: 2 }], price: 699, originalPrice: 860, image: '/assets/food/placeholder-family-feast.svg', active: true },
]
