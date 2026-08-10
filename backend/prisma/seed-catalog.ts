/**
 * FORMAL ARCHITECTURAL DESCRIPTION:
 * Idempotent Equipment Catalog seeding script. Upserts the `Category` taxonomy and enriches
 * `Product` records with category assignment, security deposit, image path, and technical
 * specifications. Keyed on the unique `sku` column so repeated execution converges to the same
 * state without duplicating rows or disturbing existing reservations.
 *
 * IN SIMPLE WORDS:
 * Fills in the equipment categories, photos, deposits and spec sheets. Safe to run more than
 * once — it updates existing gear instead of creating copies, and never touches bookings.
 *
 * Run with:  npx ts-node prisma/seed-catalog.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: 'Power Tools', slug: 'power-tools', iconKey: 'drill', description: 'Drills, grinders, impact wrenches and handheld power equipment.' },
  { name: 'Lifting Equipment', slug: 'lifting-equipment', iconKey: 'lift', description: 'Scissor lifts, boom lifts and material hoists for work at height.' },
  { name: 'Camera & Photo', slug: 'camera-photo', iconKey: 'camera', description: 'Cinema cameras, gimbals and professional lighting kits.' },
  { name: 'Generators', slug: 'generators', iconKey: 'generator', description: 'Portable inverter and diesel generators for site power.' },
  { name: 'Heavy Equipment', slug: 'heavy-equipment', iconKey: 'excavator', description: 'Track loaders, excavators and earthmoving machinery.' },
  { name: 'Concrete & Masonry', slug: 'concrete-masonry', iconKey: 'saw', description: 'Cut-off saws, compactors and concrete finishing equipment.' },
];

/**
 * Catalog rows keyed by SKU. `imageUrl` points at backend/public/equipment/<sku>.jpg, which
 * main.ts serves at /equipment/<sku>.jpg — drop a matching file in and it renders, no code change.
 */
const PRODUCTS: {
  sku: string;
  name: string;
  description: string;
  pricePerDay: number;
  deposit: number;
  totalStock: number;
  categorySlug: string;
  specifications: Record<string, string>;
}[] = [
  // ── Existing seven (enriched in place) ───────────────────────────────────
  {
    sku: 'TL-DRILL-001',
    name: 'DeWalt DWD520 Dual Speed Hammer Drill 1/2"',
    description: 'Heavy duty 10.0 Amp motor delivers high performance and overload protection for masonry & steel drilling.',
    pricePerDay: 35, deposit: 100, totalStock: 12, categorySlug: 'power-tools',
    specifications: { Motor: '10.0 Amp', 'Chuck Size': '1/2 in', 'No-Load Speed': '0-2700 rpm', Weight: '6.7 lbs' },
  },
  {
    sku: 'TL-SAW-002',
    name: 'Husqvarna K770 14" Gas Cut-Off Concrete Saw',
    description: 'Powerful all-round cut-off saw with features that make it one of the best power cutters on the market.',
    pricePerDay: 85, deposit: 300, totalStock: 5, categorySlug: 'concrete-masonry',
    specifications: { Engine: '73.5 cc', 'Blade Diameter': '14 in', 'Cutting Depth': '5 in', Weight: '22.5 lbs' },
  },
  {
    sku: 'PO-GEN-003',
    name: 'Honda EU2200i Super Quiet Inverter Generator 2200W',
    description: 'Ultra quiet 48 to 57 dBA operation. Clean stable power ideal for sensitive audiovisual & job site electronics.',
    pricePerDay: 65, deposit: 250, totalStock: 8, categorySlug: 'generators',
    specifications: { Output: '2200W max / 1800W rated', 'Noise Level': '48-57 dBA', 'Run Time': '8.1 hrs @ 25%', Weight: '46.5 lbs' },
  },
  {
    sku: 'HE-LIFT-004',
    name: 'Genie GS-1930 Electric Scissor Lift 19ft',
    description: 'Compact electric scissor lift ideal for maneuvering in tight spaces with smooth zero-emission electric operation.',
    pricePerDay: 195, deposit: 800, totalStock: 3, categorySlug: 'lifting-equipment',
    specifications: { 'Platform Height': '19 ft', 'Load Capacity': '500 lbs', Power: '24V DC Electric', Width: '2.5 ft' },
  },
  {
    sku: 'AV-CAM-005',
    name: 'Sony FX6 Cinema Line Full-Frame Camera Kit',
    description: 'Full-frame 4K 120fps recording, dual base ISO 800/12800, electronic variable ND filter for professional film sets.',
    pricePerDay: 250, deposit: 1500, totalStock: 4, categorySlug: 'camera-photo',
    specifications: { Sensor: 'Full-frame 10.2MP CMOS', Recording: '4K 120fps', 'Dual ISO': '800 / 12800', Mount: 'Sony E-mount' },
  },
  {
    sku: 'TL-HAMMER-006',
    name: 'Bosch 11255VSR SDS-plus Bulldog Xtreme Rotary Hammer',
    description: '8.0 Amp motor delivers 2.0 ft-lbs of impact energy for fast chiseling and anchoring performance.',
    pricePerDay: 45, deposit: 150, totalStock: 10, categorySlug: 'power-tools',
    specifications: { Motor: '8.0 Amp', 'Impact Energy': '2.0 ft-lbs', 'Bit System': 'SDS-plus', Weight: '7.0 lbs' },
  },
  {
    sku: 'HE-CAT-007',
    name: 'CAT 259D3 Compact Track Loader (Mini Bobcat)',
    description: '74.3 HP rubber track skid steer with high flow hydraulics for heavy construction & landscaping projects.',
    pricePerDay: 350, deposit: 2000, totalStock: 2, categorySlug: 'heavy-equipment',
    specifications: { Power: '74.3 HP', 'Operating Weight': '9,738 lbs', 'Rated Capacity': '2,690 lbs', Hydraulics: 'High Flow' },
  },

  // ── Additional mock catalog ──────────────────────────────────────────────
  {
    sku: 'TL-GRIND-008',
    name: 'Makita GA9020 9" Angle Grinder',
    description: 'High power 15 Amp motor with labyrinth construction sealing bearings against dust and debris.',
    pricePerDay: 28, deposit: 90, totalStock: 14, categorySlug: 'power-tools',
    specifications: { Motor: '15 Amp', 'Wheel Diameter': '9 in', 'No-Load Speed': '6000 rpm', Weight: '11.6 lbs' },
  },
  {
    sku: 'TL-IMPACT-009',
    name: 'Milwaukee M18 FUEL 1/2" High Torque Impact Wrench',
    description: 'Delivers 1,400 ft-lbs of nut-busting torque in a compact cordless brushless package.',
    pricePerDay: 40, deposit: 120, totalStock: 9, categorySlug: 'power-tools',
    specifications: { Torque: '1,400 ft-lbs', Drive: '1/2 in', Battery: '18V REDLITHIUM', Weight: '7.4 lbs' },
  },
  {
    sku: 'AV-GIMB-010',
    name: 'DJI Ronin 4D Handheld Cinema Gimbal',
    description: 'Four-axis stabilisation with LiDAR focusing for cinema-grade handheld camera movement.',
    pricePerDay: 180, deposit: 900, totalStock: 5, categorySlug: 'camera-photo',
    specifications: { Axes: '4-axis stabilisation', Focus: 'LiDAR range finder', Payload: '] 8.8 lbs', 'Battery Life': '2.5 hrs' },
  },
  {
    sku: 'AV-LIGHT-011',
    name: 'Aputure LS 600d Pro LED Light Kit',
    description: 'Daylight-balanced 600W COB LED with wireless DMX control for professional studio and location work.',
    pricePerDay: 95, deposit: 400, totalStock: 6, categorySlug: 'camera-photo',
    specifications: { Output: '600W COB LED', 'Colour Temp': '5600K daylight', Control: 'Wireless DMX / Sidus Link', CRI: '96+' },
  },
  {
    sku: 'HE-BOOM-012',
    name: 'JLG 450AJ Articulating Boom Lift 45ft',
    description: 'Diesel articulating boom lift with 4WD for rough-terrain access on outdoor construction sites.',
    pricePerDay: 320, deposit: 1500, totalStock: 2, categorySlug: 'lifting-equipment',
    specifications: { 'Working Height': '45 ft', 'Horizontal Reach': '24 ft', 'Load Capacity': '500 lbs', Drive: '4WD Diesel' },
  },
  {
    sku: 'HE-HOIST-013',
    name: 'Genie GL-8 Material Lift Hoist 10ft',
    description: 'Compact portable material lift for positioning loads up to 400 lbs in tight interior spaces.',
    pricePerDay: 55, deposit: 200, totalStock: 7, categorySlug: 'lifting-equipment',
    specifications: { 'Lift Height': '10 ft', 'Load Capacity': '400 lbs', Weight: '175 lbs', Operation: 'Manual winch' },
  },
  {
    sku: 'PO-DIESEL-014',
    name: 'CAT XQ125 Diesel Generator 125kVA',
    description: 'Towable prime-power diesel generator with sound-attenuated enclosure for extended site operation.',
    pricePerDay: 420, deposit: 2500, totalStock: 2, categorySlug: 'generators',
    specifications: { Output: '125 kVA', Fuel: 'Diesel', 'Tank Capacity': '200 gal', 'Noise Level': '68 dBA @ 7m' },
  },
  {
    sku: 'CM-COMPACT-015',
    name: 'Wacker Neuson WP1550 Plate Compactor',
    description: 'Single-direction vibratory plate compactor for granular soil and asphalt patch compaction.',
    pricePerDay: 60, deposit: 220, totalStock: 6, categorySlug: 'concrete-masonry',
    specifications: { 'Plate Size': '20 in', 'Centrifugal Force': '3,370 lbf', Engine: 'Honda GX160', Weight: '198 lbs' },
  },
  {
    sku: 'HE-EXCAV-016',
    name: 'Kubota KX040-4 Compact Excavator 4-Ton',
    description: 'Tight-tail-swing compact excavator with angle blade for confined-site trenching and foundation work.',
    pricePerDay: 385, deposit: 2200, totalStock: 2, categorySlug: 'heavy-equipment',
    specifications: { 'Operating Weight': '9,039 lbs', 'Dig Depth': '11 ft 3 in', Power: '40.4 HP', Swing: 'Tight tail' },
  },
];

async function main() {
  console.log('📂 Upserting equipment categories...');
  const categoryIdBySlug = new Map<string, string>();

  for (const c of CATEGORIES) {
    const category = await prisma.category.upsert({
      where: { slug: c.slug },
      update: { name: c.name, description: c.description, iconKey: c.iconKey },
      create: c,
    });
    categoryIdBySlug.set(c.slug, category.id);
  }
  console.log(`✅ ${CATEGORIES.length} categories ready`);

  console.log('🛠️  Upserting equipment catalog...');
  let created = 0;
  let updated = 0;

  for (const p of PRODUCTS) {
    const categoryId = categoryIdBySlug.get(p.categorySlug);
    if (!categoryId) throw new Error(`Unknown category slug: ${p.categorySlug}`);

    const shared = {
      name: p.name,
      description: p.description,
      pricePerDay: p.pricePerDay,
      deposit: p.deposit,
      categoryId,
      imageUrl: `/equipment/${p.sku.toLowerCase()}.jpg`,
      specifications: p.specifications,
    };

    const existing = await prisma.product.findUnique({ where: { sku: p.sku } });

    if (existing) {
      // Preserve live stock levels — warehouse RECEIVE/RELEASE logs own that number.
      await prisma.product.update({ where: { sku: p.sku }, data: shared });
      updated++;
    } else {
      await prisma.product.create({ data: { ...shared, sku: p.sku, totalStock: p.totalStock } });
      created++;
    }
  }

  console.log(`✅ Catalog ready — ${created} created, ${updated} updated (stock levels preserved)`);
}

main()
  .catch((e) => {
    console.error('❌ Catalog seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
