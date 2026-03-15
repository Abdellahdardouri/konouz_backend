import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

const prisma = new PrismaClient();

const USD_TO_MAD = parseFloat(process.env.USD_TO_MAD_RATE || '10');
const MARKUP = parseFloat(process.env.MARKUP_MULTIPLIER || '3');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CATALOG_DIR = path.resolve(__dirname, '../../back-end/catalog');

const CATEGORY_MAP: Record<string, { handle: string; titleEn: string; sortOrder: number }> = {
  'تنظيم المطبخ': { handle: 'tanzim-al-matbakh', titleEn: 'Kitchen Organization', sortOrder: 1 },
  'تنظيم الحمام': { handle: 'tanzim-al-hammam', titleEn: 'Bathroom Organization', sortOrder: 2 },
  'تخزين الطعام': { handle: 'takhzin-at-taam', titleEn: 'Food Storage', sortOrder: 3 },
  'أدوات منزلية عملية': { handle: 'adawat-manziliyya', titleEn: 'Practical Household Tools', sortOrder: 4 },
  'تنظيم الغسيل': { handle: 'tanzim-al-ghasil', titleEn: 'Laundry Organization', sortOrder: 5 },
  'تجفيف الأطباق': { handle: 'tajfif-al-atbaq', titleEn: 'Dish Drying', sortOrder: 6 },
  'سلال التخزين': { handle: 'silal-at-takhzin', titleEn: 'Storage Baskets', sortOrder: 7 },
  'أدوات التنظيف': { handle: 'adawat-at-tanzif', titleEn: 'Cleaning Tools', sortOrder: 8 },
};

const DESCRIPTION_TEMPLATES: Record<string, string> = {
  'تنظيم المطبخ': 'منتج عملي لتنظيم المطبخ يساعدك على ترتيب أدواتك بشكل أنيق وسهل الوصول. مصنوع من مواد متينة وعالية الجودة.',
  'تنظيم الحمام': 'حل ذكي لتنظيم الحمام يوفر مساحة إضافية ويحافظ على ترتيب أغراضك. مقاوم للماء والرطوبة.',
  'تخزين الطعام': 'حافظة طعام عملية تحافظ على طزاجة أطعمتك لفترة أطول. سهلة الاستخدام والتنظيف.',
  'أدوات منزلية عملية': 'أداة منزلية عملية تجعل حياتك اليومية أسهل وأكثر تنظيماً. تصميم عملي وجودة عالية.',
  'تنظيم الغسيل': 'منتج لتنظيم الغسيل يساعدك على ترتيب ملابسك بشكل أفضل. متين وسهل الاستخدام.',
  'تجفيف الأطباق': 'رف تجفيف أطباق عملي يسهل عليك تجفيف وتنظيم أواني المطبخ. تصميم أنيق يناسب مطبخك.',
  'سلال التخزين': 'سلة تخزين أنيقة وعملية لترتيب أغراض المنزل. تصميم جميل يضيف لمسة جمالية لمنزلك.',
  'أدوات التنظيف': 'أداة تنظيف فعالة تساعدك على تنظيف منزلك بسرعة وسهولة. جودة عالية ومتانة.',
};

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 80);
}

function usdToMad(usd: number): number {
  return Math.round(usd * USD_TO_MAD * MARKUP);
}

async function uploadImage(filePath: string, folder: string): Promise<{ url: string; publicId: string; width: number; height: number }> {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: `konouz/products/${folder}`,
    resource_type: 'image',
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
  };
}

async function main() {
  console.log('🌱 Starting product seeding...');
  console.log(`📊 Config: USD/MAD = ${USD_TO_MAD}, Markup = ${MARKUP}x`);

  // 1. Seed categories
  console.log('\n📁 Seeding categories...');
  const categoryRecords: Record<string, string> = {};
  for (const [arabicTitle, info] of Object.entries(CATEGORY_MAP)) {
    const cat = await prisma.category.upsert({
      where: { handle: info.handle },
      create: {
        handle: info.handle,
        title: arabicTitle,
        titleEn: info.titleEn,
        sortOrder: info.sortOrder,
      },
      update: { title: arabicTitle, titleEn: info.titleEn, sortOrder: info.sortOrder },
    });
    categoryRecords[arabicTitle] = cat.id;
    console.log(`  ✓ ${arabicTitle} (${info.handle})`);
  }

  // 2. Read product folders
  const folders = fs.readdirSync(CATALOG_DIR)
    .filter((f) => fs.statSync(path.join(CATALOG_DIR, f)).isDirectory())
    .sort();

  console.log(`\n📦 Found ${folders.length} products to import`);

  let imported = 0;
  let skipped = 0;
  const BATCH_SIZE = 5;

  for (let i = 0; i < folders.length; i += BATCH_SIZE) {
    const batch = folders.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (folder) => {
      const folderPath = path.join(CATALOG_DIR, folder);
      const infoPath = path.join(folderPath, 'info.json');

      if (!fs.existsSync(infoPath)) {
        console.log(`  ⚠ Skipping ${folder} - no info.json`);
        skipped++;
        return;
      }

      const raw = fs.readFileSync(infoPath, 'utf-8');
      const info = JSON.parse(raw);

      const sourceId = info['المعرف'];

      // Check if already imported
      const existing = await prisma.product.findUnique({ where: { sourceId } });
      if (existing) {
        skipped++;
        return;
      }

      const categoryTitle = info['التصنيف'] || 'أدوات منزلية عملية';
      const categoryId = categoryRecords[categoryTitle];
      if (!categoryId) {
        console.log(`  ⚠ Unknown category: ${categoryTitle} for ${folder}`);
        skipped++;
        return;
      }

      const englishName = info['الاسم_الإنجليزي'] || folder;
      const handle = slugify(englishName) || `product-${folder.split('_')[0]}`;
      const priceUSD = info['السعر'] || 5;
      const originalPriceUSD = info['السعر_الأصلي'];
      const priceMAD = usdToMad(priceUSD);
      const comparePriceMAD = originalPriceUSD ? usdToMad(originalPriceUSD) : null;

      const arabicName = info['الاسم'] || englishName;
      const description = `${arabicName}. ${DESCRIPTION_TEMPLATES[categoryTitle] || ''}`;

      // Upload images
      const imageFiles = (info['الصور'] as string[]) || [];
      const uploadedImages = [];

      for (let j = 0; j < imageFiles.length; j++) {
        const imgPath = path.join(folderPath, imageFiles[j]);
        if (!fs.existsSync(imgPath)) continue;

        try {
          const result = await uploadImage(imgPath, handle);
          uploadedImages.push({
            url: result.url,
            publicId: result.publicId,
            altText: arabicName,
            width: result.width,
            height: result.height,
            sortOrder: j,
            isPrimary: j === 0,
          });
        } catch (e: any) {
          console.log(`    ⚠ Image upload failed for ${imageFiles[j]}: ${e.message}`);
        }
      }

      // Create product
      try {
        await prisma.product.create({
          data: {
            handle,
            sourceId,
            title: arabicName,
            titleEn: englishName,
            description,
            descriptionHtml: `<p>${description}</p>`,
            categoryId,
            priceMAD,
            comparePriceMAD,
            costUSD: priceUSD,
            tags: info['الكلمات_المفتاحية'] || [],
            isBestSeller: info['أفضل_مبيعاً'] || false,
            images: { create: uploadedImages },
            variants: {
              create: {
                title: 'Default Title',
                priceMAD,
                optionName: 'Title',
                optionValue: 'Default Title',
              },
            },
          },
        });
        imported++;
        console.log(`  [${String(imported).padStart(3, '0')}/${folders.length}] ✓ ${arabicName} — ${priceMAD} MAD`);
      } catch (e: any) {
        console.log(`  ✗ Failed: ${arabicName} — ${e.message}`);
        skipped++;
      }
    }));
  }

  console.log(`\n✅ Seeding complete!`);
  console.log(`   Imported: ${imported}`);
  console.log(`   Skipped:  ${skipped}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Seed failed:', e);
  process.exit(1);
});
