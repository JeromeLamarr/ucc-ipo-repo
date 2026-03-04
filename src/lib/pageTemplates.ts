// Page templates with pre-created blocks and sensible defaults

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  blocks: Array<{
    section_type: string;
    content: Record<string, any>;
  }>;
}

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Page',
    description: 'Start with an empty page, add blocks as needed',
    icon: '📄',
    blocks: [],
  },
  {
    id: 'landing',
    name: 'Landing Page',
    description: 'Hero section with features and CTA',
    icon: '🚀',
    blocks: [
      {
        section_type: 'hero',
        content: {
          headline: 'Welcome to Your Page',
          headline_highlight: 'Start Here',
          subheadline: 'Add your main message and call to action',
          cta_text: 'Get Started',
          cta_link: '/register',
        },
      },
      {
        section_type: 'features',
        content: {
          features: [
            {
              title: 'Feature One',
              description: 'Describe your first key feature',
              icon_bg_color: 'bg-blue-100',
              icon_color: 'text-blue-600',
            },
            {
              title: 'Feature Two',
              description: 'Describe your second key feature',
              icon_bg_color: 'bg-purple-100',
              icon_color: 'text-purple-600',
            },
            {
              title: 'Feature Three',
              description: 'Describe your third key feature',
              icon_bg_color: 'bg-green-100',
              icon_color: 'text-green-600',
            },
          ],
        },
      },
      {
        section_type: 'cta',
        content: {
          heading: 'Ready to Get Started?',
          description: 'Join us today and start your journey',
          button_text: 'Sign Up Now',
          button_link: '/register',
          background_color: 'bg-gradient-to-r from-blue-600 to-blue-800',
        },
      },
    ],
  },
  {
    id: 'informational',
    name: 'Informational Page',
    description: 'Text content with steps and gallery',
    icon: 'ℹ️',
    blocks: [
      {
        section_type: 'hero',
        content: {
          headline: 'Learn More',
          headline_highlight: '',
          subheadline: 'Explore detailed information about our services',
          cta_text: 'Explore',
          cta_link: '#content',
        },
      },
      {
        section_type: 'text-section',
        content: {
          section_title: 'About Us',
          body_content: 'Our Mission\n\nAdd your mission statement here.\n\nOur Values\n\nDescribe your core values and what you stand for.',
          text_alignment: 'left',
          max_width: 'normal',
          background_style: 'none',
        },
      },
      {
        section_type: 'steps',
        content: {
          title: 'How It Works',
          steps: [
            {
              number: 1,
              label: 'Step One',
              description: 'Describe the first step',
            },
            {
              number: 2,
              label: 'Step Two',
              description: 'Describe the second step',
            },
            {
              number: 3,
              label: 'Step Three',
              description: 'Describe the third step',
            },
          ],
        },
      },
      {
        section_type: 'gallery',
        content: {
          title: 'Gallery',
          images: [
            {
              url: 'https://via.placeholder.com/300x300?text=Image+1',
              alt_text: 'Gallery image 1',
              caption: 'Add your first image',
            },
            {
              url: 'https://via.placeholder.com/300x300?text=Image+2',
              alt_text: 'Gallery image 2',
              caption: 'Add your second image',
            },
            {
              url: 'https://via.placeholder.com/300x300?text=Image+3',
              alt_text: 'Gallery image 3',
              caption: 'Add your third image',
            },
          ],
        },
      },
    ],
  },
  {
    id: 'contact',
    name: 'Contact Page',
    description: 'Hero, contact info, and CTA section',
    icon: '📧',
    blocks: [
      {
        section_type: 'hero',
        content: {
          headline: 'Get in Touch',
          headline_highlight: 'We\'d Love to Hear From You',
          subheadline: 'Have questions? Reach out to our team',
          cta_text: 'Contact Us',
          cta_link: 'mailto:contact@example.com',
        },
      },
      {
        section_type: 'text-section',
        content: {
          section_title: 'Contact Information',
          body_content: 'Email: contact@example.com\nPhone: (123) 456-7890\nAddress: 123 Main St, City, State 12345',
          text_alignment: 'left',
          max_width: 'normal',
          background_style: 'none',
        },
      },
      {
        section_type: 'categories',
        content: {
          title: 'Ways to Reach Us',
          categories: ['Email', 'Phone', 'In-Person', 'Social Media'],
        },
      },
      {
        section_type: 'cta',
        content: {
          heading: 'Send us a Message',
          description: 'Fill out the form on our contact page to send us a direct message',
          button_text: 'Send Message',
          button_link: '/contact/form',
          background_color: 'bg-gradient-to-r from-blue-700 to-blue-900',
        },
      },
    ],
  },
];

// Find a template by ID
export function getTemplate(templateId: string): PageTemplate | undefined {
  return PAGE_TEMPLATES.find((t) => t.id === templateId);
}

// Get all available templates
export function getAllTemplates(): PageTemplate[] {
  return PAGE_TEMPLATES;
}
