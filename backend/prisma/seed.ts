import { PrismaClient, ReservationStatus, Role, InventoryAction, PaymentStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Clearing existing data and seeding comprehensive mock environment...');

  // Reset database tables in sequence to prevent foreign key errors
  await prisma.inventoryLog.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.reservationItem.deleteMany({});
  await prisma.reservation.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});

  const saltRounds = 10;
  const defaultPasswordHash = await bcrypt.hash('Password123!', saltRounds);

  // 1. Seed Accounts
  console.log('👤 Seeding accounts...');
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@ammunation.com',
      name: 'Commander Admin',
      role: Role.ADMIN,
      passwordHash: defaultPasswordHash,
    },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: 'staff@ammunation.com',
      name: 'Agent Staff',
      role: Role.STAFF,
      passwordHash: defaultPasswordHash,
    },
  });

  const warehouseUser = await prisma.user.create({
    data: {
      email: 'warehouse@ammunation.com',
      name: 'Operator Warehouse',
      role: Role.WAREHOUSE_OPERATOR,
      passwordHash: defaultPasswordHash,
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@ammunation.com',
      name: 'John Customer',
      role: Role.CUSTOMER,
      passwordHash: defaultPasswordHash,
    },
  });

  const customer2 = await prisma.user.create({
    data: {
      email: 'sarah.connor@gmail.com',
      name: 'Sarah Connor',
      role: Role.CUSTOMER,
      passwordHash: defaultPasswordHash,
    },
  });

  const customer3 = await prisma.user.create({
    data: {
      email: 'bruce.wayne@enterprise.com',
      name: 'Bruce Wayne',
      role: Role.CUSTOMER,
      passwordHash: defaultPasswordHash,
    },
  });

  console.log('✅ Accounts seeded: Admin, Staff, Warehouse Operator, 3 Customers');

  // 2. Seed Products (Equipment Catalog)
  console.log('🛠️ Seeding equipment products...');
  const drill = await prisma.product.create({
    data: {
      sku: 'TL-DRILL-001',
      name: 'DeWalt DWD520 Dual Speed Hammer Drill 1/2"',
      description: 'Heavy duty 10.0 Amp motor delivers high performance and overload protection for masonry & steel drilling.',
      pricePerDay: 35.0,
      totalStock: 12,
    },
  });

  const saw = await prisma.product.create({
    data: {
      sku: 'TL-SAW-002',
      name: 'Husqvarna K770 14" Gas Cut-Off Concrete Saw',
      description: 'Powerful all-round cut-off saw with features that make it one of the best power cutters on the market.',
      pricePerDay: 85.0,
      totalStock: 5,
    },
  });

  const generator = await prisma.product.create({
    data: {
      sku: 'PO-GEN-003',
      name: 'Honda EU2200i Super Quiet Inverter Generator 2200W',
      description: 'Ultra quiet 48 to 57 dBA operation. Clean stable power ideal for sensitive audiovisual & job site electronics.',
      pricePerDay: 65.0,
      totalStock: 8,
    },
  });

  const lift = await prisma.product.create({
    data: {
      sku: 'HE-LIFT-004',
      name: 'Genie GS-1930 Electric Scissor Lift 19ft',
      description: 'Compact electric scissor lift ideal for maneuvering in tight spaces with smooth zero-emission electric operation.',
      pricePerDay: 195.0,
      totalStock: 3,
    },
  });

  const camera = await prisma.product.create({
    data: {
      sku: 'AV-CAM-005',
      name: 'Sony FX6 Cinema Line Full-Frame Camera Kit',
      description: 'Full-frame 4K 120fps recording, dual base ISO 800/12800, electronic variable ND filter for professional film sets.',
      pricePerDay: 250.0,
      totalStock: 4,
    },
  });

  const hammer = await prisma.product.create({
    data: {
      sku: 'TL-HAMMER-006',
      name: 'Bosch 11255VSR SDS-plus Bulldog Xtreme Rotary Hammer',
      description: '8.0 Amp motor delivers 2.0 ft-lbs of impact energy for fast chiseling and anchoring performance.',
      pricePerDay: 45.0,
      totalStock: 10,
    },
  });

  const loader = await prisma.product.create({
    data: {
      sku: 'HE-CAT-007',
      name: 'CAT 259D3 Compact Track Loader (Mini Bobcat)',
      description: '74.3 HP rubber track skid steer with high flow hydraulics for heavy construction & landscaping projects.',
      pricePerDay: 350.0,
      totalStock: 2,
    },
  });

  console.log('✅ Equipment products seeded (7 items)');

  // 3. Seed Reservations & Items
  console.log('📋 Seeding reservations...');
  
  // Reservation 1: Pending Approval (John Customer)
  const res1 = await prisma.reservation.create({
    data: {
      userId: customerUser.id,
      startDate: new Date(Date.now() + 86400000 * 2), // 2 days from now
      endDate: new Date(Date.now() + 86400000 * 5),   // 5 days from now (3 days rental)
      totalPrice: 210.0,
      status: ReservationStatus.PENDING,
      items: {
        create: [
          {
            productId: drill.id,
            quantity: 2,
            unitPrice: 35.0,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 210.0,
            status: PaymentStatus.PENDING,
            transactionId: 'TXN-PENDING-001',
          },
        ],
      },
    },
  });

  // Reservation 2: Approved (Sarah Connor)
  const res2 = await prisma.reservation.create({
    data: {
      userId: customer2.id,
      startDate: new Date(Date.now() + 86400000 * 1),
      endDate: new Date(Date.now() + 86400000 * 5),
      totalPrice: 340.0,
      status: ReservationStatus.APPROVED,
      items: {
        create: [
          {
            productId: saw.id,
            quantity: 1,
            unitPrice: 85.0,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 340.0,
            status: PaymentStatus.PAID,
            transactionId: 'TXN-PAID-002',
          },
        ],
      },
    },
  });

  // Reservation 3: Active / Checked Out (Bruce Wayne)
  const res3 = await prisma.reservation.create({
    data: {
      userId: customer3.id,
      startDate: new Date(Date.now() - 86400000 * 1), // Yesterday
      endDate: new Date(Date.now() + 86400000 * 2),   // 2 days later
      totalPrice: 1500.0,
      status: ReservationStatus.ACTIVE,
      items: {
        create: [
          {
            productId: camera.id,
            quantity: 2,
            unitPrice: 250.0,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 1500.0,
            status: PaymentStatus.PAID,
            transactionId: 'TXN-PAID-003',
          },
        ],
      },
    },
  });

  // Reservation 4: Returned (John Customer)
  const res4 = await prisma.reservation.create({
    data: {
      userId: customerUser.id,
      startDate: new Date(Date.now() - 86400000 * 10),
      endDate: new Date(Date.now() - 86400000 * 7),
      totalPrice: 195.0,
      status: ReservationStatus.RETURNED,
      items: {
        create: [
          {
            productId: generator.id,
            quantity: 1,
            unitPrice: 65.0,
          },
        ],
      },
      payments: {
        create: [
          {
            amount: 195.0,
            status: PaymentStatus.PAID,
            transactionId: 'TXN-PAID-004',
          },
        ],
      },
    },
  });

  console.log('✅ Reservations seeded: 4 reservations across PENDING, APPROVED, ACTIVE, RETURNED');

  // 4. Seed Warehouse Inventory Logs
  console.log('📦 Seeding warehouse inventory logs...');
  await prisma.inventoryLog.createMany({
    data: [
      {
        productId: drill.id,
        operatorId: warehouseUser.id,
        action: InventoryAction.RECEIVE,
        quantity: 12,
        notes: 'Initial warehouse stocking - Batch #DW-2026-A',
      },
      {
        productId: generator.id,
        operatorId: warehouseUser.id,
        action: InventoryAction.RECEIVE,
        quantity: 8,
        notes: 'New shipment received from Honda Industrial',
      },
      {
        productId: camera.id,
        operatorId: warehouseUser.id,
        action: InventoryAction.RELEASE,
        quantity: -2,
        notes: 'Equipment checked out for Active Reservation #' + res3.id.slice(0, 8),
      },
      {
        productId: hammer.id,
        operatorId: warehouseUser.id,
        action: InventoryAction.DAMAGE_RECORDED,
        quantity: -1,
        notes: 'Power cable insulation damaged during rental return. Quarantined for service.',
      },
    ],
  });

  console.log('✅ Inventory logs seeded successfully!');
  console.log('🚀 Full seed complete!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
