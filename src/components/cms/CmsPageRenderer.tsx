import type { CmsSection, CmsBranding } from './sectionRegistry';
import { renderCmsSection } from './sectionRegistry';

interface CmsPage {
  id: string;
  slug: string;
  title: string;
  is_published: boolean;
}

interface CmsPageRendererProps {
  page: CmsPage | null;
  sections: CmsSection[];
  branding: CmsBranding;
  showPageTitle?: boolean;
}

export function CmsPageRenderer({ page, sections, branding, showPageTitle = false }: CmsPageRendererProps) {
  if (!sections || sections.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <p className="text-gray-500">No content available for this page.</p>
      </div>
    );
  }

  return (
    <div>
      {showPageTitle && page?.title && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">{page.title}</h1>
        </div>
      )}
      {sections.map((section) => {
        if (!section?.id) return null;
        const rendered = renderCmsSection(section, branding);
        if (!rendered) return null;
        return <div key={section.id}>{rendered}</div>;
      })}
    </div>
  );
}
