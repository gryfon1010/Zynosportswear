import { getAdminDb } from '../lib/firebase/admin.js';

function slugify(input) {
  return String(input || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function getCategoryBySlug(db, slug) {
  const snap = await db.collection('categories').where('slug', '==', slug).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function upsertCategory(db, { name, slug, parentId = null, sortOrder = 0 }) {
  const now = new Date();
  const finalSlug = slugify(slug || name);
  const finalName = String(name || '').trim();

  const existing = await db.collection('categories').where('slug', '==', finalSlug).limit(1).get();
  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.update({
      name: finalName,
      slug: finalSlug,
      parentId: parentId || null,
      sortOrder: Number(sortOrder || 0),
      updatedAt: now,
    });
    return { id: doc.id, slug: finalSlug, action: 'updated' };
  }

  const doc = {
    name: finalName,
    slug: finalSlug,
    parentId: parentId || null,
    sortOrder: Number(sortOrder || 0),
    createdAt: now,
    updatedAt: now,
  };

  const ref = await db.collection('categories').add(doc);
  return { id: ref.id, slug: finalSlug, action: 'created' };
}

async function collectDescendantCategoryIds(db, rootIds) {
  const all = new Set(rootIds);
  const queue = [...rootIds];

  while (queue.length) {
    const parentId = queue.shift();
    const snap = await db.collection('categories').where('parentId', '==', parentId).get();
    for (const d of snap.docs) {
      if (all.has(d.id)) continue;
      all.add(d.id);
      queue.push(d.id);
    }
  }

  return [...all];
}

async function deleteProductsByCategoryIds(db, categoryIds) {
  let deleted = 0;

  // Firestore array-contains-any supports max 10 values.
  for (const ids of chunk(categoryIds, 10)) {
    // Repeat until there are no more products for this chunk.
    // (Deleting while paginating can be tricky; simplest is loop.)
    // Limit 500 per iteration to keep batches safe.
    while (true) {
      const snap = await db
        .collection('products')
        .where('categoryIds', 'array-contains-any', ids)
        .limit(500)
        .get();

      if (snap.empty) break;

      const batch = db.batch();
      for (const doc of snap.docs) {
        batch.delete(doc.ref);
      }
      await batch.commit();
      deleted += snap.size;

      // If less than limit, we've cleared this chunk.
      if (snap.size < 500) break;
    }
  }

  return deleted;
}

async function deleteCategoriesByIds(db, categoryIds) {
  // Delete deepest first: fetch all docs and sort by depth.
  const docs = [];
  for (const id of categoryIds) {
    const snap = await db.collection('categories').doc(id).get();
    if (snap.exists) docs.push({ id, ...snap.data() });
  }

  const byId = new Map(docs.map((d) => [d.id, d]));
  function depth(id) {
    let d = 0;
    let cur = byId.get(id);
    while (cur && cur.parentId && byId.has(cur.parentId)) {
      d += 1;
      cur = byId.get(cur.parentId);
    }
    return d;
  }

  docs.sort((a, b) => depth(b.id) - depth(a.id));

  let deleted = 0;
  for (const group of chunk(docs, 450)) {
    const batch = db.batch();
    for (const c of group) batch.delete(db.collection('categories').doc(c.id));
    await batch.commit();
    deleted += group.length;
  }

  return deleted;
}

async function main() {
  const db = getAdminDb();
  if (!db) {
    throw new Error('Firebase Admin is not configured for this process. Make sure your .env.local is set, then run with node --env-file .env.local');
  }

  console.log('Loading categories...');
  const catSnap = await db.collection('categories').get();
  const categories = catSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const targetSlugs = new Set(['gym-wear', 'jim-wear', 'sports-wear', 'sportswear', 'gymwear']);
  const targetRoots = categories.filter((c) => {
    const slug = slugify(c?.slug || '');
    const name = slugify(c?.name || '');
    return targetSlugs.has(slug) || targetSlugs.has(name);
  });

  if (!targetRoots.length) {
    console.log('No Gym Wear/Jim Wear/Sports Wear root categories found. Skipping delete step.');
  } else {
    const rootIds = targetRoots.map((c) => c.id);
    console.log('Found wear categories:', targetRoots.map((c) => ({ id: c.id, name: c.name, slug: c.slug })));

    const allWearCategoryIds = await collectDescendantCategoryIds(db, rootIds);
    console.log(`Total categories to remove (including descendants): ${allWearCategoryIds.length}`);

    console.log('Deleting products in these categories...');
    const prodDeleted = await deleteProductsByCategoryIds(db, allWearCategoryIds);
    console.log(`Deleted products: ${prodDeleted}`);

    console.log('Deleting categories...');
    const catDeleted = await deleteCategoriesByIds(db, allWearCategoryIds);
    console.log(`Deleted categories: ${catDeleted}`);
  }

  // Seed Boxing mega-menu structure EXACTLY as per screenshot
  const boxing = await getCategoryBySlug(db, 'boxing');
  if (!boxing) {
    throw new Error('Boxing category not found (slug "boxing"). Seed top categories first, then re-run.');
  }

  console.log('Seeding Boxing mega-menu groups + items...');

  const groups = [
    {
      name: 'Approved Ranges',
      slug: 'approved-ranges',
      sortOrder: 0,
      items: [{ name: 'IBA Approved Boxing Range', slug: 'iba-approved-boxing-range', sortOrder: 0 }],
    },
    {
      name: 'Boxing Gloves',
      slug: 'boxing-gloves',
      sortOrder: 10,
      items: [
        { name: 'Competition Gloves', slug: 'competition-gloves', sortOrder: 0 },
        { name: 'Sparring Gloves', slug: 'sparring-gloves', sortOrder: 10 },
        { name: 'Training Gloves', slug: 'training-gloves', sortOrder: 20 },
        { name: 'Kids Boxing Gloves', slug: 'kids-boxing-gloves', sortOrder: 30 },
        { name: 'Bag Gloves', slug: 'bag-gloves', sortOrder: 40 },
        { name: 'Boxing Gloves & Pads', slug: 'boxing-gloves-and-pads', sortOrder: 50 },
      ],
    },
    {
      name: 'Punch Bags',
      slug: 'punch-bags',
      sortOrder: 20,
      items: [
        { name: 'Training Punching Bags', slug: 'training-punching-bags', sortOrder: 0 },
        { name: 'Punching Bags & Mitt Sets', slug: 'punching-bags-and-mitt-sets', sortOrder: 10 },
        { name: 'Freestanding Punch Bags', slug: 'freestanding-punch-bags', sortOrder: 20 },
        { name: 'Angle & Uppercut Bags', slug: 'angle-and-uppercut-bags', sortOrder: 30 },
        { name: 'Double End Bags', slug: 'double-end-bags', sortOrder: 40 },
        { name: 'Speed Bags & Platforms', slug: 'speed-bags-and-platforms', sortOrder: 50 },
        { name: 'Kids Punch Bags', slug: 'kids-punch-bags', sortOrder: 60 },
        { name: 'Accessories', slug: 'punch-bag-accessories', sortOrder: 70 },
      ],
    },
    {
      name: 'Coaching Equipment',
      slug: 'coaching-equipment',
      sortOrder: 30,
      items: [
        { name: 'Focus Pads', slug: 'focus-pads', sortOrder: 0 },
        { name: 'Paddles Mitts', slug: 'paddles-mitts', sortOrder: 10 },
        { name: 'Training Sticks', slug: 'training-sticks', sortOrder: 20 },
        { name: 'Body Protectors', slug: 'body-protectors', sortOrder: 30 },
      ],
    },
    {
      name: 'Protective Gear',
      slug: 'protective-gear',
      sortOrder: 40,
      items: [
        { name: 'Hand Wraps & Inner Gloves', slug: 'hand-wraps-and-inner-gloves', sortOrder: 0 },
        { name: 'Head Gear', slug: 'head-gear', sortOrder: 10 },
        { name: 'Mouth Guards', slug: 'mouth-guards', sortOrder: 20 },
        { name: 'Chest Guards', slug: 'chest-guards', sortOrder: 30 },
        { name: 'Groin Protectors', slug: 'groin-protectors', sortOrder: 40 },
        { name: 'Knee Wraps', slug: 'knee-wraps', sortOrder: 50 },
        { name: 'Kids Protective Gear', slug: 'kids-protective-gear', sortOrder: 60 },
      ],
    },
    {
      name: 'Training Equipment',
      slug: 'training-equipment',
      sortOrder: 50,
      items: [
        { name: 'Jump Ropes', slug: 'jump-ropes', sortOrder: 0 },
        { name: 'Pull Up Bars', slug: 'pull-up-bars', sortOrder: 10 },
        { name: 'Fitness Sandbags', slug: 'fitness-sandbags', sortOrder: 20 },
        { name: 'Leg Stretchers', slug: 'leg-stretchers', sortOrder: 30 },
      ],
    },
    {
      name: 'Apparel',
      slug: 'boxing-apparel',
      sortOrder: 60,
      items: [
        { name: 'Boxing Trunks', slug: 'boxing-trunks', sortOrder: 0 },
        { name: 'Compression Wear', slug: 'compression-wear', sortOrder: 10 },
        { name: 'T-Shirts & Vests', slug: 't-shirts-and-vests', sortOrder: 20 },
        { name: 'Sauna Suits', slug: 'sauna-suits', sortOrder: 30 },
      ],
    },
  ];

  const created = [];
  for (const g of groups) {
    const groupRes = await upsertCategory(db, {
      name: g.name,
      slug: g.slug,
      parentId: boxing.id,
      sortOrder: g.sortOrder,
    });
    created.push({ level: 'group', ...groupRes, name: g.name });

    for (const it of g.items) {
      const itemRes = await upsertCategory(db, {
        name: it.name,
        slug: it.slug,
        parentId: groupRes.id,
        sortOrder: it.sortOrder,
      });
      created.push({ level: 'item', ...itemRes, name: it.name });
    }
  }

  console.log('Boxing seeding complete. Results:', created);

  // Seed MMA mega-menu structure EXACTLY as per screenshot
  const mma = await getCategoryBySlug(db, 'mma');
  if (!mma) {
    throw new Error('MMA category not found (slug "mma"). Seed top categories first, then re-run.');
  }

  console.log('Seeding MMA mega-menu groups + items...');

  const mmaGroups = [
    {
      name: 'Approved Ranges',
      slug: 'mma-approved-ranges',
      sortOrder: 0,
      items: [
        { name: 'IMMAF Approved Range', slug: 'mma-immaf-approved-range', sortOrder: 0 },
        { name: 'WAKO Approved Range', slug: 'mma-wako-approved-range', sortOrder: 10 },
      ],
    },
    {
      name: 'MMA Gloves',
      slug: 'mma-gloves',
      sortOrder: 10,
      items: [
        { name: 'Sparring Gloves', slug: 'mma-sparring-gloves', sortOrder: 0 },
        { name: 'Training Gloves', slug: 'mma-training-gloves', sortOrder: 10 },
        { name: 'Kids Grappling Gloves', slug: 'mma-kids-grappling-gloves', sortOrder: 20 },
      ],
    },
    {
      name: 'MMA Punch Bags',
      slug: 'mma-punch-bags',
      sortOrder: 20,
      items: [
        { name: 'MMA Training Punching Bags', slug: 'mma-training-punching-bags', sortOrder: 0 },
        { name: 'MMA Punching Bags & Mitts Sets', slug: 'mma-punching-bags-and-mitts-sets', sortOrder: 10 },
        { name: 'Freestanding Punch Bags', slug: 'mma-freestanding-punch-bags', sortOrder: 20 },
        { name: 'Angle & Uppercut Bags', slug: 'mma-angle-and-uppercut-bags', sortOrder: 30 },
        { name: 'Accessories', slug: 'mma-punch-bag-accessories', sortOrder: 40 },
        { name: 'Kids MMA Bags', slug: 'mma-kids-bags', sortOrder: 50 },
        { name: 'Speed Bags & Platforms', slug: 'mma-speed-bags-and-platforms', sortOrder: 60 },
      ],
    },
    {
      name: 'Coaching Equipment',
      slug: 'mma-coaching-equipment',
      sortOrder: 30,
      items: [
        { name: 'Focus Mitts', slug: 'mma-focus-mitts', sortOrder: 0 },
        { name: 'Kicking Shields', slug: 'mma-kicking-shields', sortOrder: 10 },
        { name: 'Thai Pads', slug: 'mma-thai-pads', sortOrder: 20 },
        { name: 'Chest Guard', slug: 'mma-chest-guard', sortOrder: 30 },
      ],
    },
    {
      name: 'Protective Gear',
      slug: 'mma-protective-gear',
      sortOrder: 40,
      items: [
        { name: 'Hand Wraps & Inner Gloves', slug: 'mma-hand-wraps-and-inner-gloves', sortOrder: 0 },
        { name: 'Head Gear', slug: 'mma-head-gear', sortOrder: 10 },
        { name: 'Mouth Guards', slug: 'mma-mouth-guards', sortOrder: 20 },
        { name: 'Chest Guards', slug: 'mma-chest-guards', sortOrder: 30 },
        { name: 'Groin Protectors', slug: 'mma-groin-protectors', sortOrder: 40 },
        { name: 'Knee Wraps', slug: 'mma-knee-wraps', sortOrder: 50 },
        { name: 'Shin Guards', slug: 'mma-shin-guards', sortOrder: 60 },
      ],
    },
    {
      name: 'Training Equipment',
      slug: 'mma-training-equipment',
      sortOrder: 50,
      items: [
        { name: 'Jump Ropes', slug: 'mma-jump-ropes', sortOrder: 0 },
        { name: 'Pull Up Bars', slug: 'mma-pull-up-bars', sortOrder: 10 },
        { name: 'Fitness Sandbags', slug: 'mma-fitness-sandbags', sortOrder: 20 },
        { name: 'Leg Stretchers', slug: 'mma-leg-stretchers', sortOrder: 30 },
      ],
    },
    {
      name: 'Apparel',
      slug: 'mma-apparel',
      sortOrder: 60,
      items: [
        { name: 'MMA Shorts', slug: 'mma-shorts', sortOrder: 0 },
        { name: 'Compression Wear', slug: 'mma-compression-wear', sortOrder: 10 },
        { name: 'Sauna Suits', slug: 'mma-sauna-suits', sortOrder: 20 },
      ],
    },
    {
      name: 'Equipment Bags',
      slug: 'mma-equipment-bags',
      sortOrder: 70,
      items: [{ name: 'Equipment Bags', slug: 'mma-equipment-bags-items', sortOrder: 0 }],
    },
  ];

  const mmaCreated = [];
  for (const g of mmaGroups) {
    const groupRes = await upsertCategory(db, {
      name: g.name,
      slug: g.slug,
      parentId: mma.id,
      sortOrder: g.sortOrder,
    });
    mmaCreated.push({ level: 'group', ...groupRes, name: g.name });

    for (const it of g.items) {
      const itemRes = await upsertCategory(db, {
        name: it.name,
        slug: it.slug,
        parentId: groupRes.id,
        sortOrder: it.sortOrder,
      });
      mmaCreated.push({ level: 'item', ...itemRes, name: it.name });
    }
  }

  console.log('MMA seeding complete. Results:', mmaCreated);

  // Seed Fitness mega-menu structure EXACTLY as per screenshot
  const fitness = await getCategoryBySlug(db, 'fitness');
  if (!fitness) {
    throw new Error('Fitness category not found (slug "fitness"). Seed top categories first, then re-run.');
  }

  console.log('Seeding Fitness mega-menu groups + items...');

  const fitnessGroups = [
    {
      name: 'Gym Gloves',
      slug: 'fitness-gym-gloves',
      sortOrder: 0,
      items: [
        { name: 'Fitness & Workout', slug: 'fitness-and-workout', sortOrder: 0 },
        { name: 'Training & Gym', slug: 'training-and-gym', sortOrder: 10 },
        { name: 'Heavy Weight Lifting', slug: 'heavy-weight-lifting', sortOrder: 20 },
      ],
    },
    {
      name: 'Weightlifting Belts',
      slug: 'fitness-weightlifting-belts',
      sortOrder: 10,
      items: [
        { name: 'Leather Belts', slug: 'fitness-leather-belts', sortOrder: 0 },
        { name: 'Training Belts', slug: 'fitness-training-belts', sortOrder: 10 },
        { name: 'Dipping Belts', slug: 'fitness-dipping-belts', sortOrder: 20 },
        { name: 'Powerlifting Belts', slug: 'fitness-powerlifting-belts', sortOrder: 30 },
      ],
    },
    {
      name: 'Weightlifting Gear',
      slug: 'fitness-weightlifting-gear',
      sortOrder: 20,
      items: [
        { name: 'Weightlifting Grip & Straps', slug: 'fitness-weightlifting-grip-and-straps', sortOrder: 0 },
        { name: 'Arm Blaster', slug: 'fitness-arm-blaster', sortOrder: 10 },
        { name: 'AB Strap & Triceps Rope', slug: 'fitness-ab-strap-and-triceps-rope', sortOrder: 20 },
        { name: 'Head Harness', slug: 'fitness-head-harness', sortOrder: 30 },
      ],
    },
    {
      name: 'Strength Training',
      slug: 'fitness-strength-training',
      sortOrder: 30,
      items: [
        { name: 'Pull Up Bars', slug: 'fitness-pull-up-bars', sortOrder: 0 },
        { name: 'Jump Ropes', slug: 'fitness-jump-ropes', sortOrder: 10 },
        { name: 'Leg Stretchers', slug: 'fitness-leg-stretchers', sortOrder: 20 },
        { name: 'Fitness Bags', slug: 'fitness-bags', sortOrder: 30 },
        { name: 'Kettlebells', slug: 'fitness-kettlebells', sortOrder: 40 },
      ],
    },
    {
      name: 'Stability & Mobility',
      slug: 'fitness-stability-and-mobility',
      sortOrder: 40,
      items: [
        { name: 'Ab Rollers', slug: 'fitness-ab-rollers', sortOrder: 0 },
        { name: 'Aerobic Step', slug: 'fitness-aerobic-step', sortOrder: 10 },
        { name: 'Balance Boards', slug: 'fitness-balance-boards', sortOrder: 20 },
        { name: 'Resistance Bands', slug: 'fitness-resistance-bands', sortOrder: 30 },
        { name: 'Resistance Tubes', slug: 'fitness-resistance-tubes', sortOrder: 40 },
      ],
    },
    {
      name: 'Braces & Support',
      slug: 'fitness-braces-and-support',
      sortOrder: 50,
      items: [
        { name: 'Elbow Support', slug: 'fitness-elbow-support', sortOrder: 0 },
        { name: 'Back support', slug: 'fitness-back-support', sortOrder: 10 },
        { name: 'Wrist Support', slug: 'fitness-wrist-support', sortOrder: 20 },
        { name: 'Knee Support', slug: 'fitness-knee-support', sortOrder: 30 },
        { name: 'Ankle Support', slug: 'fitness-ankle-support', sortOrder: 40 },
      ],
    },
    {
      name: 'Gym Essentials',
      slug: 'fitness-gym-essentials',
      sortOrder: 60,
      items: [
        { name: 'Sauna Suits', slug: 'fitness-sauna-suits', sortOrder: 0 },
        { name: 'Compression Wear', slug: 'fitness-compression-wear', sortOrder: 10 },
        { name: 'Equipment Bags', slug: 'fitness-equipment-bags', sortOrder: 20 },
      ],
    },
  ];

  const fitnessCreated = [];
  for (const g of fitnessGroups) {
    const groupRes = await upsertCategory(db, {
      name: g.name,
      slug: g.slug,
      parentId: fitness.id,
      sortOrder: g.sortOrder,
    });
    fitnessCreated.push({ level: 'group', ...groupRes, name: g.name });

    for (const it of g.items) {
      const itemRes = await upsertCategory(db, {
        name: it.name,
        slug: it.slug,
        parentId: groupRes.id,
        sortOrder: it.sortOrder,
      });
      fitnessCreated.push({ level: 'item', ...itemRes, name: it.name });
    }
  }

  console.log('Fitness seeding complete. Results:', fitnessCreated);

  // Seed Yoga mega-menu structure EXACTLY as per screenshot
  const yoga = await getCategoryBySlug(db, 'yoga');
  if (!yoga) {
    throw new Error('Yoga category not found (slug "yoga"). Seed top categories first, then re-run.');
  }

  console.log('Seeding Yoga mega-menu groups + items...');

  const yogaGroups = [
    {
      name: 'Yoga',
      slug: 'yoga-yoga',
      sortOrder: 0,
      items: [
        { name: 'Cork Yoga Mat', slug: 'yoga-cork-yoga-mat', sortOrder: 0 },
        { name: 'PU Mat', slug: 'yoga-pu-mat', sortOrder: 10 },
        { name: 'TPE Mat', slug: 'yoga-tpe-mat', sortOrder: 20 },
        { name: 'PVC Mat', slug: 'yoga-pvc-mat', sortOrder: 30 },
        { name: 'Cork Yoga Block', slug: 'yoga-cork-yoga-block', sortOrder: 40 },
        { name: 'EVA Yoga Block', slug: 'yoga-eva-yoga-block', sortOrder: 50 },
        { name: 'Plain Yoga Strap', slug: 'yoga-plain-yoga-strap', sortOrder: 60 },
        { name: 'Color Yoga Strap', slug: 'yoga-color-yoga-strap', sortOrder: 70 },
        { name: 'Gym Ball', slug: 'yoga-gym-ball', sortOrder: 80 },
        { name: 'Balance Trainer', slug: 'yoga-balance-trainer', sortOrder: 90 },
      ],
    },
    {
      name: 'Yoga Mats',
      slug: 'yoga-mats',
      sortOrder: 10,
      items: [
        { name: 'PVC Yoga Mats', slug: 'yoga-pvc-yoga-mats', sortOrder: 0 },
        { name: 'TPE Yoga Mats', slug: 'yoga-tpe-yoga-mats', sortOrder: 10 },
        { name: 'Cork Yoga Mats', slug: 'yoga-cork-yoga-mats', sortOrder: 20 },
        { name: 'PU Yoga Mats', slug: 'yoga-pu-yoga-mats', sortOrder: 30 },
      ],
    },
    {
      name: 'Yoga Blocks',
      slug: 'yoga-blocks',
      sortOrder: 20,
      items: [
        { name: 'EVA Foam Blocks', slug: 'yoga-eva-foam-blocks', sortOrder: 0 },
        { name: 'Cork Block', slug: 'yoga-cork-block', sortOrder: 10 },
      ],
    },
    {
      name: 'Yoga Strap',
      slug: 'yoga-strap',
      sortOrder: 30,
      items: [
        { name: 'Plain Yoga Straps', slug: 'yoga-plain-yoga-straps', sortOrder: 0 },
        { name: 'Color Yoga Straps', slug: 'yoga-color-yoga-straps', sortOrder: 10 },
      ],
    },
    {
      name: 'Yoga Balls',
      slug: 'yoga-balls',
      sortOrder: 40,
      items: [
        { name: 'Yoga Ball With Base', slug: 'yoga-ball-with-base', sortOrder: 0 },
        { name: 'Balance Trainer Ball', slug: 'balance-trainer-ball', sortOrder: 10 },
      ],
    },
    {
      name: 'Stability & Mobility',
      slug: 'yoga-stability-and-mobility',
      sortOrder: 50,
      items: [
        { name: 'Ab Rollers', slug: 'yoga-ab-rollers', sortOrder: 0 },
        { name: 'Aerobic Steps', slug: 'yoga-aerobic-steps', sortOrder: 10 },
        { name: 'Balance Boards', slug: 'yoga-balance-boards', sortOrder: 20 },
        { name: 'Bands & Tubes', slug: 'yoga-bands-and-tubes', sortOrder: 30 },
      ],
    },
  ];

  const yogaCreated = [];
  for (const g of yogaGroups) {
    const groupRes = await upsertCategory(db, {
      name: g.name,
      slug: g.slug,
      parentId: yoga.id,
      sortOrder: g.sortOrder,
    });
    yogaCreated.push({ level: 'group', ...groupRes, name: g.name });

    for (const it of g.items) {
      const itemRes = await upsertCategory(db, {
        name: it.name,
        slug: it.slug,
        parentId: groupRes.id,
        sortOrder: it.sortOrder,
      });
      yogaCreated.push({ level: 'item', ...itemRes, name: it.name });
    }
  }

  console.log('Yoga seeding complete. Results:', yogaCreated);

  // Seed Apparel mega-menu structure EXACTLY as per screenshot
  const apparel = await getCategoryBySlug(db, 'apparel');
  if (!apparel) {
    throw new Error('Apparel category not found (slug "apparel"). Seed top categories first, then re-run.');
  }

  console.log('Seeding Apparel mega-menu groups + items...');

  const apparelGroups = [
    {
      name: 'Active Wear',
      slug: 'apparel-active-wear',
      sortOrder: 0,
      items: [
        { name: 'T-Shirts', slug: 'apparel-t-shirts', sortOrder: 0 },
        { name: 'Trousers', slug: 'apparel-trousers', sortOrder: 10 },
        { name: 'Vest', slug: 'apparel-vest', sortOrder: 20 },
      ],
    },
    {
      name: 'Compression Wear & Shorts',
      slug: 'apparel-compression-wear-and-shorts',
      sortOrder: 10,
      items: [
        { name: 'MMA Shorts', slug: 'apparel-mma-shorts', sortOrder: 0 },
        { name: 'Compression Shorts & Pants', slug: 'apparel-compression-shorts-and-pants', sortOrder: 10 },
        { name: 'Sweatshirts', slug: 'apparel-sweatshirts', sortOrder: 20 },
      ],
    },
    {
      name: 'Sauna Range',
      slug: 'apparel-sauna-range',
      sortOrder: 20,
      items: [
        { name: 'Sauna Suits', slug: 'apparel-sauna-suits', sortOrder: 0 },
        { name: 'Sauna Vests', slug: 'apparel-sauna-vests', sortOrder: 10 },
        { name: 'Sauna T-Shirts', slug: 'apparel-sauna-t-shirts', sortOrder: 20 },
        { name: 'Sauna Shorts', slug: 'apparel-sauna-shorts', sortOrder: 30 },
        { name: 'Sauna Leggings', slug: 'apparel-sauna-leggings', sortOrder: 40 },
      ],
    },
  ];

  const apparelCreated = [];
  for (const g of apparelGroups) {
    const groupRes = await upsertCategory(db, {
      name: g.name,
      slug: g.slug,
      parentId: apparel.id,
      sortOrder: g.sortOrder,
    });
    apparelCreated.push({ level: 'group', ...groupRes, name: g.name });

    for (const it of g.items) {
      const itemRes = await upsertCategory(db, {
        name: it.name,
        slug: it.slug,
        parentId: groupRes.id,
        sortOrder: it.sortOrder,
      });
      apparelCreated.push({ level: 'item', ...itemRes, name: it.name });
    }
  }

  console.log('Apparel seeding complete. Results:', apparelCreated);

  // Seed Collections mega-menu structure EXACTLY as per screenshot
  const collections = await getCategoryBySlug(db, 'collections');
  if (!collections) {
    throw new Error('Collections category not found (slug "collections"). Seed top categories first, then re-run.');
  }

  console.log('Seeding Collections mega-menu groups + items...');

  const collectionsGroups = [
    {
      name: 'Series',
      slug: 'collections-series',
      sortOrder: 0,
      items: [
        { name: 'MARK', slug: 'series-mark', sortOrder: 0 },
        { name: 'AURA+', slug: 'series-aura-plus', sortOrder: 10 },
        { name: 'KARA', slug: 'series-kara', sortOrder: 20 },
        { name: 'NOIR', slug: 'series-noir', sortOrder: 30 },
        { name: 'NERO', slug: 'series-nero', sortOrder: 40 },
        { name: 'HARRIER', slug: 'series-hARRIER', sortOrder: 50 },
        { name: 'AURA', slug: 'series-aura', sortOrder: 60 },
        { name: 'EGO', slug: 'series-ego', sortOrder: 70 },
      ],
    },
    {
      name: 'Ranges',
      slug: 'collections-ranges',
      sortOrder: 10,
      items: [
        { name: 'Skipping Ropes', slug: 'ranges-skipping-ropes', sortOrder: 0 },
        { name: 'Braces & Support', slug: 'ranges-braces-and-support', sortOrder: 10 },
        { name: 'Sauna Range 2.0', slug: 'ranges-sauna-range-2-0', sortOrder: 20 },
      ],
    },
    {
      name: 'Approvals / Certifications',
      slug: 'collections-approvals-and-certifications',
      sortOrder: 20,
      items: [
        { name: 'IMMAF Approved', slug: 'immaf-approved', sortOrder: 0 },
        { name: 'WAKO Approved', slug: 'wako-approved', sortOrder: 10 },
        { name: 'IBA (AIBA) Approved', slug: 'iba-aiba-approved', sortOrder: 20 },
        { name: 'BBBoC Approved', slug: 'bbboc-approved', sortOrder: 30 },
        { name: 'BIBA Approved', slug: 'biba-approved', sortOrder: 40 },
        { name: 'FIGMMA Approved', slug: 'figmma-approved', sortOrder: 50 },
        { name: 'IPL Approved', slug: 'ipl-approved', sortOrder: 60 },
        { name: 'SMMAF Approved', slug: 'smmaf-approved', sortOrder: 70 },
        { name: 'USPA Approved', slug: 'uspa-approved', sortOrder: 80 },
        { name: 'GPC Approved', slug: 'gpc-approved', sortOrder: 90 },
        { name: 'WPC Approved', slug: 'wpc-approved', sortOrder: 100 },
        { name: 'EMMAA Approved', slug: 'emmaa-approved', sortOrder: 110 },
        { name: 'NEVADA Approved', slug: 'nevada-approved', sortOrder: 120 },
        { name: 'NYAC Approved', slug: 'nyac-approved', sortOrder: 130 },
        { name: 'USA Boxing Approved', slug: 'usa-boxing-approved', sortOrder: 140 },
      ],
    },
  ];

  const collectionsCreated = [];
  for (const g of collectionsGroups) {
    const groupRes = await upsertCategory(db, {
      name: g.name,
      slug: g.slug,
      parentId: collections.id,
      sortOrder: g.sortOrder,
    });
    collectionsCreated.push({ level: 'group', ...groupRes, name: g.name });

    for (const it of g.items) {
      const itemRes = await upsertCategory(db, {
        name: it.name,
        slug: it.slug,
        parentId: groupRes.id,
        sortOrder: it.sortOrder,
      });
      collectionsCreated.push({ level: 'item', ...itemRes, name: it.name });
    }
  }

  console.log('Collections seeding complete. Results:', collectionsCreated);

  // Seed Kids mega-menu structure EXACTLY as per screenshot
  const kids = await getCategoryBySlug(db, 'kids');
  if (!kids) {
    throw new Error('Kids category not found (slug "kids"). Seed top categories first, then re-run.');
  }

  console.log('Seeding Kids mega-menu groups + items...');

  const kidsGroups = [
    {
      name: 'Kids',
      slug: 'kids-kids',
      sortOrder: 0,
      items: [
        { name: 'Kids Boxing Sets', slug: 'kids-boxing-sets', sortOrder: 0 },
        { name: 'Kids Boxing Gloves', slug: 'kids-boxing-gloves', sortOrder: 10 },
        { name: 'Kids MMA Gloves', slug: 'kids-mma-gloves', sortOrder: 20 },
        { name: 'Kids Head Guard', slug: 'kids-head-guard', sortOrder: 30 },
        { name: 'Kids Punch Bags', slug: 'kids-punch-bags', sortOrder: 40 },
        { name: 'Kids Focus Pads', slug: 'kids-focus-pads', sortOrder: 50 },
      ],
    },
  ];

  const kidsCreated = [];
  for (const g of kidsGroups) {
    const groupRes = await upsertCategory(db, {
      name: g.name,
      slug: g.slug,
      parentId: kids.id,
      sortOrder: g.sortOrder,
    });
    kidsCreated.push({ level: 'group', ...groupRes, name: g.name });

    for (const it of g.items) {
      const itemRes = await upsertCategory(db, {
        name: it.name,
        slug: it.slug,
        parentId: groupRes.id,
        sortOrder: it.sortOrder,
      });
      kidsCreated.push({ level: 'item', ...itemRes, name: it.name });
    }
  }

  console.log('Kids seeding complete. Results:', kidsCreated);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
