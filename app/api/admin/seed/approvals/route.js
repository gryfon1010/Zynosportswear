import { NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/admin/auth';

const APPROVALS_SUBCATEGORIES = [
  { name: 'IMMAF Approved', slug: 'immaf-approved' },
  { name: 'WAKO Approved', slug: 'wako-approved' },
  { name: 'IBA (AIBA) Approved', slug: 'iba-aiba-approved' },
  { name: 'BBBoC Approved', slug: 'bbhoc-approved' },
  { name: 'BIBA Approved', slug: 'biba-approved' },
  { name: 'FIGMMA Approved', slug: 'figmma-approved' },
  { name: 'IPL Approved', slug: 'ipl-approved' },
  { name: 'SMMAF Approved', slug: 'smmaf-approved' },
  { name: 'USPA Approved', slug: 'uspa-approved' },
  { name: 'GPC Approved', slug: 'gpc-approved' },
  { name: 'WPC Approved', slug: 'wpc-approved' },
  { name: 'EMMAA Approved', slug: 'emmaa-approved' },
  { name: 'NEVADA Approved', slug: 'nevada-approved' },
  { name: 'NYAC Approved', slug: 'nyac-approved' },
  { name: 'USA Boxing Approved', slug: 'usa-boxing-approved' },
];

export async function POST(req) {
  try {
    const auth = await requireAdmin(req);
    if (!auth.ok) return auth.response;

    const { adminDb } = auth;
    const body = await req.json().catch(() => ({}));
    const parentId = body?.parentId;

    if (!parentId || typeof parentId !== 'string') {
      return NextResponse.json({ error: 'parentId is required (Approvals/Certifications category ID)' }, { status: 400 });
    }

    const now = new Date();
    const results = [];

    for (let i = 0; i < APPROVALS_SUBCATEGORIES.length; i++) {
      const subcat = APPROVALS_SUBCATEGORIES[i];
      
      // Check if already exists
      const existing = await adminDb
        .collection('categories')
        .where('slug', '==', subcat.slug)
        .where('parentId', '==', parentId)
        .limit(1)
        .get();
      
      if (!existing.empty) {
        results.push({ name: subcat.name, id: existing.docs[0].id, status: 'exists' });
        continue;
      }

      const doc = {
        name: subcat.name,
        slug: subcat.slug,
        parentId,
        sortOrder: i,
        image: '',
        description: `${subcat.name} certified products`,
        active: true,
        createdAt: now,
        updatedAt: now,
      };

      const ref = await adminDb.collection('categories').add(doc);
      results.push({ name: subcat.name, id: ref.id, status: 'created' });
    }

    return NextResponse.json({ 
      success: true, 
      message: `Added ${results.filter(r => r.status === 'created').length} new subcategories`,
      results 
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create subcategories' },
      { status: 500 }
    );
  }
}
