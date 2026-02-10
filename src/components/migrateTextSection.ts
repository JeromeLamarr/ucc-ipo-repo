// Migration helper: convert old text section data to new format
import { TextSectionContent } from './TextSectionNew';

export function migrateOldToNew(oldContent: any): TextSectionContent {
  return {
    title: oldContent.title,
    body: oldContent.body,
    textAlign: oldContent.textAlign || 'left',
    textSize: {
      'sm': 'sm',
      'base': 'md',
      'md': 'md',
      'lg': 'lg',
      'xl': 'lg'
    }[oldContent.fontSize] || 'md',
    backgroundColor: oldContent.backgroundColor || '#ffffff',
    textColor: oldContent.textColor || '#000000',
    padding: 'md',
    layout: 'single',
  };
}
