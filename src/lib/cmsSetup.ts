import { supabase } from './supabase';

/**
 * Ensure the home page exists in CMS with default landing template
 * Call this on app initialization
 */
export async function ensureHomeCMSPageExists() {
  try {
    // Check if home page already exists
    const { data: existing } = await supabase
      .from('cms_pages')
      .select('id')
      .eq('slug', 'home')
      .single();

    if (existing) {
      // Home page already exists
      return existing.id;
    }

    // Create home page with landing template
    const { data: pageData, error: pageError } = await supabase
      .from('cms_pages')
      .insert([{
        title: 'Home',
        slug: 'home',
        is_published: true,
      }] as any)
      .select();

    if (pageError || !pageData || pageData.length === 0) {
      console.error('Failed to create home CMS page:', pageError);
      return null;
    }

    const pageId = (pageData[0] as any).id;

    // Create default sections for landing page
    const defaultSections = [
      {
        page_id: pageId,
        section_type: 'hero',
        content: {
          headline: 'University Intellectual',
          headline_highlight: 'Property Management System',
          subheadline: 'Streamline your intellectual property submissions, evaluations, and approvals with our comprehensive management platform.',
          cta_text: 'Get Started',
          cta_link: '/register',
        },
        order_index: 0,
      },
      {
        page_id: pageId,
        section_type: 'features',
        content: {
          features: [
            {
              title: 'Streamlined Submissions',
              description: 'Easy-to-use interface for submitting your intellectual property disclosures',
              icon_bg_color: 'bg-blue-100',
              icon_color: 'text-blue-600',
            },
            {
              title: 'Expert Evaluation',
              description: 'Have your submissions reviewed by qualified evaluators and supervisors',
              icon_bg_color: 'bg-purple-100',
              icon_color: 'text-purple-600',
            },
            {
              title: 'Comprehensive Support',
              description: 'Get guidance through every step of the IP management process',
              icon_bg_color: 'bg-green-100',
              icon_color: 'text-green-600',
            },
          ],
        },
        order_index: 1,
      },
    ];

    const { error: sectionsError } = await supabase
      .from('cms_sections')
      .insert(defaultSections as any);

    if (sectionsError) {
      console.error('Failed to create home page sections:', sectionsError);
      return null;
    }

    console.log('✅ Home CMS page created successfully');
    return pageId;
  } catch (error) {
    console.error('Error ensuring home CMS page exists:', error);
    return null;
  }
}

/**
 * Ensure the Benefits and FAQ sections exist on the Home page.
 * This is idempotent — it only inserts a section type if it does not already
 * exist on the page, so it is safe to call on every app startup.
 */
export async function ensureHomePageSections() {
  try {
    // Find the published home page
    const { data: pageData, error: pageError } = await supabase
      .from('cms_pages')
      .select('id')
      .eq('slug', 'home')
      .eq('is_published', true)
      .maybeSingle();

    if (pageError || !pageData) return;

    const pageId = pageData.id;

    // Fetch existing section types on this page
    const { data: existing, error: fetchError } = await supabase
      .from('cms_sections')
      .select('section_type, order_index')
      .eq('page_id', pageId)
      .order('order_index', { ascending: true });

    if (fetchError || !existing) return;

    const existingTypes = existing.map((s: any) => s.section_type);
    const maxOrder = existing.reduce((max: number, s: any) => Math.max(max, s.order_index ?? 0), 0);

    const toInsert: any[] = [];
    let nextOrder = maxOrder + 1;

    if (!existingTypes.includes('benefits')) {
      toInsert.push({
        page_id: pageId,
        section_type: 'benefits',
        content: {
          title: 'Why Use UCC-IPO?',
          subtitle: 'Designed to simplify intellectual property registration, monitoring, and record management for the university community.',
          items: [
            { title: 'Centralized IP Record Management', description: 'Store and organize intellectual property submissions in one secure and accessible platform.' },
            { title: 'Easy Submission Process', description: 'Allow students, faculty, and researchers to submit intellectual property details and supporting documents efficiently.' },
            { title: 'Status Tracking and Monitoring', description: 'Let applicants monitor the progress of their submissions and stay informed throughout the review process.' },
            { title: 'Secure Document Handling', description: 'Manage sensitive files and records with controlled access and role-based permissions.' },
            { title: 'Faster Administrative Review', description: 'Help administrators and assigned personnel review, validate, and process submissions more efficiently.' },
            { title: 'Improved Transparency and Accessibility', description: 'Provide a clearer, more transparent workflow for intellectual property registration and documentation.' },
          ],
        },
        order_index: nextOrder++,
      });
    }

    if (!existingTypes.includes('faq')) {
      toInsert.push({
        page_id: pageId,
        section_type: 'faq',
        content: {
          title: 'Frequently Asked Questions',
          subtitle: 'Quick answers to common questions about using the UCC-IPO platform.',
          items: [
            { question: 'Who can use the UCC-IPO platform?', answer: 'Students, faculty members, researchers, and authorized university personnel may use the platform based on their assigned roles and permissions.' },
            { question: 'What types of intellectual property can be submitted?', answer: 'The platform may accommodate various intellectual property records such as copyright, patent-related works, utility models, industrial designs, trademarks, and other university-recognized submissions.' },
            { question: 'Do I need supporting documents when submitting?', answer: 'Yes. Applicants should provide the required supporting files and relevant documentation to help validate and process the submission properly.' },
            { question: 'Can I track the status of my submission?', answer: 'Yes. The system allows users to monitor submission progress and receive updates during the review and documentation process.' },
            { question: 'Is my submitted information secure?', answer: 'Yes. The platform is designed with role-based access control and secure record handling to protect sensitive intellectual property information.' },
            { question: 'Can I update my submission after sending it?', answer: 'This depends on the submission status and system rules. In some cases, updates may only be allowed before the review process is finalized.' },
          ],
        },
        order_index: nextOrder++,
      });
    }

    if (toInsert.length === 0) return;

    const { error: insertError } = await supabase
      .from('cms_sections')
      .insert(toInsert as any);

    if (insertError) {
      console.error('Failed to insert home page sections:', insertError);
    } else {
      console.log(`✅ Added ${toInsert.map(s => s.section_type).join(', ')} to Home page`);
    }
  } catch (error) {
    console.error('Error ensuring home page sections:', error);
  }
}
