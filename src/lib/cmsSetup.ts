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
