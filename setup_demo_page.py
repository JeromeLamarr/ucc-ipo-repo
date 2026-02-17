#!/usr/bin/env python3
"""
CMS Demo Page Setup Script
Creates a comprehensive demo page with all CMS sections and uploads sample images

Usage:
    python setup_demo_page.py

Requirements:
    - supabase-py
    - python-dotenv
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

try:
    from supabase import create_client, Client
except ImportError:
    print("❌ supabase-py not installed. Installing...")
    os.system(f"{sys.executable} -m pip install supabase -q")
    from supabase import create_client, Client

def get_supabase_client() -> Client:
    """Initialize and return Supabase client"""
    url = os.getenv("SUPABASE_URL") or "https://xqrqcvktxgkiuvqnxmom.supabase.co"
    key = os.getenv("SUPABASE_KEY") or "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhxcnFjdmt0eGdraXV2cW54bW9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE2Njc2NzAwMDAsImV4cCI6MTk4MzI0NjAwMH0.h_TUv-gUHN1KbEyRbUWJsFxZqxlFqgN8S_1xGqW5yqA"
    
    return create_client(url, key)

def upload_image(supabase: Client, image_path: str, page_slug: str = "demo") -> str:
    """Upload image to Supabase Storage and return public URL"""
    print(f"📤 Uploading image from: {image_path}")
    
    # Read image file
    with open(image_path, 'rb') as f:
        image_data = f.read()
    
    # Generate unique filename
    import time
    import random
    import string
    
    timestamp = int(time.time() * 1000)
    random_str = ''.join(random.choices(string.ascii_lowercase + string.digits, k=8))
    file_name = Path(image_path).name
    uploaded_file_name = f"{page_slug}-{timestamp}-{random_str}-{file_name}"
    file_path = f"{page_slug}/{uploaded_file_name}"
    
    # Upload to Supabase Storage
    try:
        response = supabase.storage.from_("cms-images").upload(
            file_path,
            image_data,
            {"cacheControl": "3600", "upsert": False}
        )
        
        print(f"✅ Image uploaded successfully!")
        
        # Get public URL
        public_url = supabase.storage.from_("cms-images").get_public_url(file_path)
        print(f"📍 Public URL: {public_url['publicUrl']}")
        
        return public_url["publicUrl"]
    
    except Exception as e:
        print(f"❌ Upload failed: {str(e)}")
        return None

def create_demo_page(supabase: Client, image_url: str):
    """Create demo page with all CMS sections"""
    print("\n📄 Creating demo page...")
    
    try:
        # 1. Create or get the demo page
        page_data = supabase.table("cms_pages").upsert({
            "slug": "demo",
            "title": "CMS Demo - All Sections",
            "description": "Comprehensive demo page showcasing all available CMS sections and features",
            "is_published": True,
        }).execute()
        
        if not page_data.data:
            print(f"❌ Error creating page")
            return
        
        page_id = page_data.data[0]["id"]
        print(f"✅ Demo page created/retrieved: {page_id}")
        
        # 2. Create sections
        print("\n📋 Creating CMS sections...")
        
        sections = [
            # 1. HERO SECTION
            {
                "page_id": page_id,
                "section_type": "hero",
                "order_index": 0,
                "content": {
                    "headline": "Welcome to",
                    "headline_highlight": "UCC IP Management System",
                    "subheadline": "A comprehensive platform for managing intellectual property, protecting innovation, and promoting excellence across the university",
                    "cta_text": "Get Started",
                    "cta_link": "/register",
                    "background_image": image_url,
                }
            },
            # 2. FEATURES SECTION
            {
                "page_id": page_id,
                "section_type": "features",
                "order_index": 1,
                "content": {
                    "features": [
                        {
                            "title": "Secure Storage",
                            "description": "Enterprise-grade security for your IP documents and records",
                            "icon_bg_color": "bg-blue-100",
                            "icon_color": "text-blue-600"
                        },
                        {
                            "title": "Easy Management",
                            "description": "Intuitive interface to manage and track all intellectual property",
                            "icon_bg_color": "bg-purple-100",
                            "icon_color": "text-purple-600"
                        },
                        {
                            "title": "Real-time Analytics",
                            "description": "Monitor submissions, approvals, and evaluation progress in real-time",
                            "icon_bg_color": "bg-green-100",
                            "icon_color": "text-green-600"
                        },
                        {
                            "title": "Collaboration Tools",
                            "description": "Work seamlessly with supervisors, evaluators, and stakeholders",
                            "icon_bg_color": "bg-orange-100",
                            "icon_color": "text-orange-600"
                        }
                    ]
                }
            },
            # 3. STEPS SECTION
            {
                "page_id": page_id,
                "section_type": "steps",
                "order_index": 2,
                "content": {
                    "title": "How It Works",
                    "steps": [
                        {
                            "number": 1,
                            "label": "Register & Login",
                            "description": "Create your account and log in to the system"
                        },
                        {
                            "number": 2,
                            "label": "Submit IP Record",
                            "description": "Fill out the IP disclosure form with all required information"
                        },
                        {
                            "number": 3,
                            "label": "Expert Review",
                            "description": "Submit for evaluation and feedback from IP experts"
                        },
                        {
                            "number": 4,
                            "label": "Decision & Next Steps",
                            "description": "Receive decision and guidance on protecting your innovation"
                        }
                    ]
                }
            },
            # 4. CATEGORIES SECTION
            {
                "page_id": page_id,
                "section_type": "categories",
                "order_index": 3,
                "content": {
                    "title": "Intellectual Property Types",
                    "categories": [
                        {"name": "Patents", "description": "Protect your inventions and technological innovations"},
                        {"name": "Trademarks", "description": "Safeguard your brand identity and logos"},
                        {"name": "Copyright", "description": "Register and protect creative works"},
                        {"name": "Trade Secrets", "description": "Manage and protect confidential business information"},
                        {"name": "Designs", "description": "Protect industrial designs and aesthetic creations"}
                    ]
                }
            },
            # 5. TEXT SECTION
            {
                "page_id": page_id,
                "section_type": "text-section",
                "order_index": 4,
                "content": {
                    "section_title": "About IP Protection",
                    "body_content": "Intellectual Property (IP) is the product of human creativity and innovation. It includes inventions, literary and artistic works, designs, and symbols used in commerce. Protecting your IP is crucial for maintaining competitive advantage, attracting investors, and ensuring your innovations benefit you and your organization.\n\nAt the University of Caloocan City, we are committed to supporting faculty, students, and researchers in protecting and commercializing their intellectual property. Our state-of-the-art management system makes it easy to disclose, evaluate, and manage all types of IP.",
                    "text_alignment": "left",
                    "max_width": "normal",
                    "background_style": "light_gray",
                    "show_divider": True,
                    "text_style_preset": "default",
                    "title_style": "normal",
                    "text_size": "medium",
                    "visual_tone": "neutral",
                    "accent_icon": "none",
                    "emphasize_section": False,
                    "vertical_spacing": "normal"
                }
            },
            # 6. SHOWCASE SECTION
            {
                "page_id": page_id,
                "section_type": "showcase",
                "order_index": 5,
                "content": {
                    "title": "Our Success Stories",
                    "items": [
                        {
                            "title": "Patent for Advanced Robotics",
                            "description": "Successfully filed a patent for an innovative robotics system developed by our engineering department",
                            "image_url": image_url,
                            "image_width": 400,
                            "image_height": 300,
                            "image_position": "center"
                        },
                        {
                            "title": "Medical Device Innovation",
                            "description": "Created a trademark for a groundbreaking medical diagnostic tool",
                            "image_url": image_url,
                            "image_width": 400,
                            "image_height": 300,
                            "image_position": "center"
                        },
                        {
                            "title": "Software Framework",
                            "description": "Copyrighted a comprehensive open-source software framework used by developers worldwide",
                            "image_url": image_url,
                            "image_width": 400,
                            "image_height": 300,
                            "image_position": "center"
                        }
                    ]
                }
            },
            # 7. GALLERY SECTION
            {
                "page_id": page_id,
                "section_type": "gallery",
                "order_index": 6,
                "content": {
                    "title": "Gallery",
                    "images": [
                        {
                            "url": image_url,
                            "alt_text": "UCC IP Office Building",
                            "caption": "Main Office Building",
                            "offset_x": 50,
                            "offset_y": 50
                        },
                        {
                            "url": image_url,
                            "alt_text": "Research Lab",
                            "caption": "State-of-the-art Research Facilities",
                            "offset_x": 50,
                            "offset_y": 50
                        },
                        {
                            "url": image_url,
                            "alt_text": "Team Meeting",
                            "caption": "Expert Evaluation Team",
                            "offset_x": 50,
                            "offset_y": 50
                        }
                    ],
                    "columns": 3
                }
            },
            # 8. CTA SECTION
            {
                "page_id": page_id,
                "section_type": "cta",
                "order_index": 7,
                "content": {
                    "heading": "Ready to Protect Your Innovation?",
                    "description": "Join hundreds of faculty members and students who have already secured their intellectual property through our platform.",
                    "button_text": "Start Your IP Journey",
                    "button_link": "/register",
                    "background_color": "bg-blue-600"
                }
            }
        ]
        
        # Insert all sections
        for section in sections:
            try:
                result = supabase.table("cms_sections").upsert(section).execute()
                section_type = section["section_type"].upper()
                print(f"  ✅ {section_type} section created")
            except Exception as e:
                print(f"  ❌ Error creating {section['section_type']}: {str(e)}")
        
        # 3. Display summary
        print("\n✨ Demo page setup complete!")
        print("\n📊 Sections created:")
        for i, section in enumerate(sections, 1):
            print(f"  {i}. {section['section_type'].upper()}")
        
        print("\n🌐 View your demo page at:")
        print("  http://localhost:5173/pages/demo (development)")
        print("  https://yourdomain.com/pages/demo (production)")
        
    except Exception as e:
        print(f"❌ Error setting up demo page: {str(e)}")
        import traceback
        traceback.print_exc()

def main():
    print("🚀 CMS Demo Page Setup Script")
    print("================================\n")
    
    # Check for image
    image_path = r"C:\Users\delag\Downloads\IMG_0977.jpg"
    if not Path(image_path).exists():
        print(f"❌ Image not found at: {image_path}")
        print("\nPlease ensure the image exists at:")
        print(f"  {image_path}")
        sys.exit(1)
    
    # Initialize Supabase
    try:
        supabase = get_supabase_client()
        print("✅ Connected to Supabase\n")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {str(e)}")
        sys.exit(1)
    
    # Upload image
    image_url = upload_image(supabase, image_path, "demo")
    
    if not image_url:
        print("❌ Failed to upload image. Setup aborted.")
        sys.exit(1)
    
    # Create demo page with all sections
    create_demo_page(supabase, image_url)

if __name__ == "__main__":
    main()
