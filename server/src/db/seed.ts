import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

async function seed() {
  const client = await pool.connect();
  try {
    console.log('🌱 Seeding database...');
    await client.query('BEGIN');

    // ─── USERS ───────────────────────────────
    const adminId = uuidv4();
    const managerId = uuidv4();
    const cashierId = uuidv4();
    const staffId = uuidv4();

    const adminHash = await bcrypt.hash('Admin@1234', 10);
    const userHash = await bcrypt.hash('User@1234', 10);

    await client.query(`
      INSERT INTO users (id, name, email, password_hash, role, phone) VALUES
      ($1, 'Super Admin', 'admin@tailorshop.com', $2, 'super_admin', '+60123456789'),
      ($3, 'Ahmad Manager', 'manager@tailorshop.com', $4, 'manager', '+60123456790'),
      ($5, 'Siti Cashier', 'cashier@tailorshop.com', $6, 'cashier', '+60123456791'),
      ($7, 'Hafiz Staff', 'staff@tailorshop.com', $8, 'inventory_staff', '+60123456792')
      ON CONFLICT (email) DO NOTHING
    `, [adminId, adminHash, managerId, userHash, cashierId, userHash, staffId, userHash]);

    // ─── PRODUCT CATEGORIES ───────────────────
    const catSuits = uuidv4();
    const catDresses = uuidv4();
    const catAccessories = uuidv4();
    const catFootwear = uuidv4();
    const catShirts = uuidv4();
    const catPerfumes = uuidv4();

    await client.query(`
      INSERT INTO product_categories (id, name, slug, description, sort_order) VALUES
      ($1, 'Suits & Blazers', 'suits-blazers', 'Men''s suits, blazers, and formal wear', 1),
      ($2, 'Wedding Dresses', 'wedding-dresses', 'Bridal gowns and wedding dresses', 2),
      ($3, 'Accessories', 'accessories', 'Belts, ties, pocket squares, and more', 3),
      ($4, 'Footwear', 'footwear', 'Formal shoes and wedding footwear', 4),
      ($5, 'Shirts & Trousers', 'shirts-trousers', 'Formal shirts and dress trousers', 5),
      ($6, 'Perfumes', 'perfumes', 'Premium fragrances and perfumes', 6)
      ON CONFLICT (slug) DO NOTHING
    `, [catSuits, catDresses, catAccessories, catFootwear, catShirts, catPerfumes]);

    // ─── PRODUCTS ────────────────────────────
    const products = [
      { id: uuidv4(), name: 'Classic Black Tuxedo', category_id: catSuits, sku: 'TS-SUIT-001', barcode: '1234567890001', type: 'both', selling_price: 1200, rental_price: 150, fine: 30, desc: 'Elegant black tuxedo for formal occasions and weddings' },
      { id: uuidv4(), name: 'Royal Blue Wedding Suit', category_id: catSuits, sku: 'TS-SUIT-002', barcode: '1234567890002', type: 'rental', selling_price: null, rental_price: 180, fine: 35, desc: 'Premium royal blue suit perfect for wedding ceremonies' },
      { id: uuidv4(), name: 'Ivory Wedding Dress', category_id: catDresses, sku: 'TS-DRESS-001', barcode: '1234567890003', type: 'rental', selling_price: null, rental_price: 350, fine: 60, desc: 'Stunning ivory ballgown with lace details' },
      { id: uuidv4(), name: 'Champagne A-Line Dress', category_id: catDresses, sku: 'TS-DRESS-002', barcode: '1234567890004', type: 'rental', selling_price: null, rental_price: 300, fine: 50, desc: 'Elegant champagne A-line wedding dress' },
      { id: uuidv4(), name: 'Premium Leather Belt', category_id: catAccessories, sku: 'TS-BELT-001', barcode: '1234567890005', type: 'sale', selling_price: 120, rental_price: null, fine: 0, desc: 'Genuine leather formal belt' },
      { id: uuidv4(), name: 'Luxury Oud Perfume', category_id: catPerfumes, sku: 'TS-PERF-001', barcode: '1234567890006', type: 'sale', selling_price: 280, rental_price: null, fine: 0, desc: 'Premium oud fragrance 100ml' },
      { id: uuidv4(), name: 'Oxford Formal Shoes', category_id: catFootwear, sku: 'TS-SHOE-001', barcode: '1234567890007', type: 'both', selling_price: 380, rental_price: 50, fine: 15, desc: 'Classic oxford leather formal shoes' },
      { id: uuidv4(), name: 'White Formal Shirt', category_id: catShirts, sku: 'TS-SHIRT-001', barcode: '1234567890008', type: 'both', selling_price: 180, rental_price: 30, fine: 10, desc: 'Crisp white formal shirt with French cuffs' },
      { id: uuidv4(), name: 'Navy Dress Trousers', category_id: catShirts, sku: 'TS-TRSR-001', barcode: '1234567890009', type: 'both', selling_price: 220, rental_price: 40, fine: 10, desc: 'Tailored navy blue dress trousers' },
      { id: uuidv4(), name: 'Charcoal Slim Blazer', category_id: catSuits, sku: 'TS-BLZR-001', barcode: '1234567890010', type: 'both', selling_price: 680, rental_price: 100, fine: 20, desc: 'Modern slim-fit charcoal blazer' },
      { id: uuidv4(), name: 'Gold Cufflinks Set', category_id: catAccessories, sku: 'TS-CUFF-001', barcode: '1234567890011', type: 'sale', selling_price: 150, rental_price: null, fine: 0, desc: 'Elegant gold-plated cufflinks set' },
      { id: uuidv4(), name: 'Bridal Veil & Tiara Set', category_id: catDresses, sku: 'TS-VEIL-001', barcode: '1234567890012', type: 'rental', selling_price: null, rental_price: 80, fine: 20, desc: 'Crystal-embellished bridal veil and tiara set' },
    ];

    for (const p of products) {
      await client.query(`
        INSERT INTO products (id, name, description, category_id, sku, barcode, type, selling_price, rental_price_per_day, late_fine_per_day)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (sku) DO NOTHING
      `, [p.id, p.name, p.desc, p.category_id, p.sku, p.barcode, p.type, p.selling_price, p.rental_price, p.fine]);
    }

    // ─── PRODUCT VARIANTS ────────────────────
    const sizes = ['S', 'M', 'L', 'XL'];
    const suitSizes = ['36', '38', '40', '42', '44', '46'];
    const shoesSizes = ['39', '40', '41', '42', '43', '44', '45'];
    const dressSizes = ['XS', 'S', 'M', 'L', 'XL'];

    const getVariantSizes = (sku: string) => {
      if (sku.includes('SUIT') || sku.includes('BLZR')) return suitSizes;
      if (sku.includes('DRESS') || sku.includes('VEIL')) return dressSizes;
      if (sku.includes('SHOE')) return shoesSizes;
      if (sku.includes('BELT') || sku.includes('PERF') || sku.includes('CUFF')) return ['One Size'];
      return sizes;
    };

    for (const p of products) {
      const variantSizes = getVariantSizes(p.sku);
      for (const sz of variantSizes) {
        const varId = uuidv4();
        const varSku = `${p.sku}-${sz}`;
        const stockQty = Math.floor(Math.random() * 8) + 2;
        const availRent = p.type !== 'sale' ? Math.floor(stockQty * 0.8) : 0;

        await client.query(`
          INSERT INTO product_variants (id, product_id, sku, size, stock_quantity, available_for_rent, selling_price, rental_price_per_day)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          ON CONFLICT (sku) DO NOTHING
        `, [varId, p.id, varSku, sz, stockQty, availRent, p.selling_price, p.rental_price]);
      }
    }

    // ─── CUSTOMERS ───────────────────────────
    const customers = [
      { id: uuidv4(), name: 'Muhammad Arif', phone: '+60112345678', whatsapp: '+60112345678', email: 'arif@email.com', address: 'No 12, Jalan Ampang, 50450 KL' },
      { id: uuidv4(), name: 'Siti Nurhaliza', phone: '+60123456789', whatsapp: '+60123456789', email: 'siti@email.com', address: 'Blok B-12, Desa Petaling, 57100 KL' },
      { id: uuidv4(), name: 'Ahmad Faiz', phone: '+60134567890', whatsapp: '+60134567890', email: 'faiz@email.com', address: 'Taman Melati, 53100 KL' },
      { id: uuidv4(), name: 'Nurul Aina', phone: '+60145678901', whatsapp: '+60145678901', email: 'aina@email.com', address: 'Sri Damansara, 52200 KL' },
      { id: uuidv4(), name: 'Hafizuddin Razak', phone: '+60156789012', whatsapp: '+60156789012', email: 'hafiz@email.com', address: 'Subang Jaya, 47500 Selangor' },
    ];

    for (const c of customers) {
      await client.query(`
        INSERT INTO customers (id, name, phone, whatsapp, email, address)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT DO NOTHING
      `, [c.id, c.name, c.phone, c.whatsapp, c.email, c.address]);
    }

    // ─── SAMPLE RENTALS ──────────────────────
    const today = new Date();
    const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);
    const lastWeek = new Date(today); lastWeek.setDate(today.getDate() - 7);
    const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);

    const fmt = (d: Date) => d.toISOString().split('T')[0];

    const rental1Id = uuidv4();
    const rental2Id = uuidv4();
    const rental3Id = uuidv4();

    await client.query(`
      INSERT INTO rentals (id, booking_number, customer_id, status, rental_start_date, rental_end_date, advance_payment, total_rental_cost, notes, event_type, created_by)
      VALUES
        ($1, 'TS-2024-0001', $2, 'picked_up', $3, $4, 200, 330, 'Wedding at Dewan Sri Maju', 'Wedding', $5),
        ($6, 'TS-2024-0002', $7, 'reserved', $8, $9, 100, 430, 'Annual gala dinner', 'Formal Event', $5),
        ($10, 'TS-2024-0003', $11, 'late_return', $12, $13, 150, 195, 'Birthday celebration', 'Birthday', $5)
    `, [
      rental1Id, customers[0].id, fmt(lastWeek), fmt(tomorrow), adminId,
      rental2Id, customers[1].id, fmt(tomorrow), fmt(nextWeek),
      rental3Id, customers[2].id, fmt(lastWeek), fmt(yesterday),
    ]);

    // ─── DEFAULT SETTINGS ─────────────────────
    const defaultSettings = [
      { key: 'shop_name', value: 'The Outfit Lounge', category: 'shop', label: 'Shop Name' },
      { key: 'shop_address', value: '2nd Floor, 6 Station Road, Homagama.', category: 'shop', label: 'Shop Address' },
      { key: 'shop_phone', value: '+94 77 845 1180', category: 'shop', label: 'Shop Phone' },
      { key: 'shop_email', value: 'info@theoutfitlounge.com', category: 'shop', label: 'Shop Email' },
      { key: 'currency', value: 'LKR', category: 'shop', label: 'Currency' },
      { key: 'currency_symbol', value: 'LKR', category: 'shop', label: 'Currency Symbol' },
      { key: 'tax_rate', value: '0', category: 'shop', label: 'Tax Rate (%)' },
      { key: 'rental_grace_period', value: '0', category: 'rental', label: 'Grace Period (days)' },
      { key: 'min_rental_days', value: '1', category: 'rental', label: 'Minimum Rental Days' },
      { key: 'default_fine_per_day', value: '200', category: 'rental', label: 'Default Fine Per Day (LKR)' },
      { key: 'low_stock_threshold', value: '3', category: 'inventory', label: 'Low Stock Threshold' },
      { key: 'sms_enabled', value: 'false', category: 'notifications', label: 'SMS Notifications' },
      { key: 'whatsapp_enabled', value: 'false', category: 'notifications', label: 'WhatsApp Notifications' },
      { key: 'email_enabled', value: 'false', category: 'notifications', label: 'Email Notifications' },
      { key: 'fitsms_api_token', value: '', category: 'notifications', label: 'FitSMS API Token' },
      { key: 'fitsms_sender_id', value: 'OutfitLnge', category: 'notifications', label: 'FitSMS Sender ID' },
      { key: 'booking_prefix', value: 'TS', category: 'rental', label: 'Booking Number Prefix' },
    ];

    for (const s of defaultSettings) {
      await client.query(`
        INSERT INTO settings (key, value, category, label)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (key) DO NOTHING
      `, [s.key, s.value, s.category, s.label]);
    }

    await client.query('COMMIT');
    console.log('✅ Seed data inserted successfully!');
    console.log('');
    console.log('🔐 Admin credentials:');
    console.log('   Email:    admin@tailorshop.com');
    console.log('   Password: Admin@1234');
    console.log('');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
