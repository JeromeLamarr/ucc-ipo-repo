#!/usr/bin/env node
/**
 * CMS Demo Page Setup Script (FIXED VERSION)
 * - Authenticates before uploading
 * - Better error handling
 * - Clear debugging logs
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ===============================
// 🔐 CONFIGURATION
// ===============================

const SUPABASE_URL =
  process.env.SUPABASE_URL ||
  'https://mqfftubqlwiemtxpagps.supabase.co';

const SUPABASE_KEY =
  process.env.SUPABASE_ANON_KEY ||
  'YOUR_ANON_PUBLIC_KEY_HERE'; // ← replace if needed

// 👇 IMPORTANT: Use a REAL admin user here
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@ucc-ipo.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'AdminPassword123!';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ===============================
// 🔐 AUTHENTICATE USER
// ===============================

async function authenticate() {
  console.log('🔐 Authenticating user...');

  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  if (error) {
    console.error('❌ Login failed:', error.message);
    process.exit(1);
  }

  console.log('✅ Authenticated successfully\n');
  return data.session;
}

// ===============================
// 📤 UPLOAD IMAGE
// ===============================

async function uploadImage(imagePath, pageSlug) {
  try {
    console.log(`📤 Uploading image from: ${imagePath}`);

    const fileBuffer = fs.readFileSync(imagePath);
    const fileName = path.basename(imagePath);

    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    const uploadedFileName = `${pageSlug}-${timestamp}-${randomStr}-${fileName}`;
    const filePath = `${pageSlug}/${uploadedFileName}`;

    const { data, error } = await supabase.storage
      .from('cms-images')
      .upload(filePath, fileBuffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: 'image/jpeg',
      });

    if (error) {
      console.error('❌ Upload failed:', error);
      return null;
    }

    const { data: publicData } = supabase.storage
      .from('cms-images')
      .getPublicUrl(filePath);

    console.log('✅ Image uploaded successfully!');
    console.log(`📍 Public URL: ${publicData.publicUrl}\n`);

    return publicData.publicUrl;
  } catch (error) {
    console.error('❌ Upload exception:', error);
    return null;
  }
}

// ===============================
// 📄 CREATE DEMO PAGE
// ===============================

async function createDemoPage(imageUrl) {
  console.log('📄 Creating demo page...');

  const { data: pageData, error: pageError } = await supabase
    .from('cms_pages')
    .upsert(
      {
        slug: 'demo',
        title: 'CMS Demo - All Sections',
        description:
          'Comprehensive demo page showcasing all available CMS sections and features',
        is_published: true,
      },
      { onConflict: 'slug' }
    )
    .select()
    .single();

  if (pageError) {
    console.error('❌ Page creation error:', pageError);
    return;
  }

  console.log(`✅ Demo page ready: ${pageData.id}\n`);

  const pageId = pageData.id;

  // Delete existing sections first (clean reset)
  await supabase.from('cms_sections').delete().eq('page_id', pageId);

  const sections = [
    {
      page_id: pageId,
      section_type: 'hero',
      order_index: 0,
      content: {
        headline: 'Welcome to',
        headline_highlight: 'UCC IP Management System',
        subheadline:
          'A comprehensive platform for managing intellectual property.',
        cta_text: 'Get Started',
        cta_link: '/register',
        background_image: imageUrl,
      },
    },
    {
      page_id: pageId,
      section_type: 'cta',
      order_index: 1,
      content: {
        heading: 'Ready to Protect Your Innovation?',
        description:
          'Join hundreds who already secured their intellectual property.',
        button_text: 'Start Your IP Journey',
        button_link: '/register',
        background_color: 'bg-blue-600',
      },
    },
  ];

  const { data: sectionsData, error: sectionsError } = await supabase
    .from('cms_sections')
    .insert(sections)
    .select();

  if (sectionsError) {
    console.error('❌ Section creation error:', sectionsError);
    return;
  }

  console.log(`✅ Created ${sectionsData.length} sections\n`);

  console.log('✨ Demo page setup complete!');
  console.log('🌐 http://localhost:5173/pages/demo');
}

// ===============================
// 🚀 MAIN
// ===============================

async function main() {
  console.log('🚀 CMS Demo Page Setup Script');
  console.log('================================\n');

  // Test DB connection
  const { error: testError } = await supabase
    .from('cms_pages')
    .select('id')
    .limit(1);

  if (testError) {
    console.error('❌ Database connection failed:', testError);
    process.exit(1);
  }

  console.log('✅ Database connection successful\n');

  // Authenticate first
  await authenticate();

  const imagePath = 'C:\\Users\\delag\\Downloads\\IMG_0977.jpg';

  if (!fs.existsSync(imagePath)) {
    console.error(`❌ Image not found at: ${imagePath}`);
    process.exit(1);
  }

  const imageUrl = await uploadImage(imagePath, 'demo');

  if (!imageUrl) {
    console.error('❌ Image upload failed. Aborting.');
    process.exit(1);
  }

  await createDemoPage(imageUrl);
}

main().catch(console.error);
