#!/usr/bin/env node

/**
 * Script to upload UCC logo to Supabase Storage
 * Usage: node scripts/upload-logo.js
 */

import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("❌ Missing Supabase credentials");
  console.error("Set VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables");
  process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function uploadLogo() {
  try {
    // Path to logo file
    const logoPath = path.join(process.cwd(), "C:\\Users\\delag\\Desktop\\ucc ipo\\ucc_logo.png");
    
    if (!fs.existsSync(logoPath)) {
      console.error(`❌ Logo file not found at: ${logoPath}`);
      process.exit(1);
    }

    console.log(`📤 Uploading logo from: ${logoPath}`);

    // Read file
    const fileBuffer = fs.readFileSync(logoPath);
    
    // Create assets bucket if it doesn't exist (optional)
    console.log("📁 Checking for 'assets' bucket...");
    
    // Upload to Supabase Storage
    console.log("⏳ Uploading to Supabase Storage...");
    
    const { data, error } = await supabase.storage
      .from("assets")
      .upload("ucc_logo.png", fileBuffer, {
        cacheControl: "3600",
        upsert: true,
        contentType: "image/png",
      });

    if (error) {
      console.error("❌ Upload failed:", error.message);
      process.exit(1);
    }

    console.log("✅ Logo uploaded successfully!");
    console.log("📍 Path:", data.path);
    console.log("\n✨ The certificate function will now use this logo as:");
    console.log("   • Header logo (60x60 px)")
    console.log("   • Watermark in background (10% opacity)");
    
  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

uploadLogo();
