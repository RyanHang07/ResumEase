export { generateClassicLatex } from './classic';
export { generateCompactLatex } from './compact';
export { generateTwoColumnLatex } from './two-column';
export { generateAcademicLatex } from './academic';
export { generateDeveloperLatex } from './developer';
export {
  AUTHOR_CREDIT,
  escapeLatex,
  extractUsername,
  getAtsContactParts,
  getAtsLatexPreamble,
  getContactParts,
  getCredits,
  getIconPackages,
  isAtsStandardSectionName,
  normalizeSectionName,
} from './shared';
export type { CanonicalSectionType } from './shared';
