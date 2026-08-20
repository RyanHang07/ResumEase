import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  AlignmentType,
  BorderStyle,
  TabStopType,
  TabStopPosition,
} from 'docx';
import type { Resume, Section, StandardSection, SkillsSection } from '@/types/resume';
import {
  getEducationMetaParts,
  getEntryDateText,
  getEntryPrimaryText,
  getEntrySecondaryText,
  getHeaderContactPlainLines,
} from '@/lib/resumeDisplay';
import { normalizeSectionName } from '@/lib/templates/shared';

const NAME_SIZE = 40;
const CONTACT_SIZE = 22;
const SECTION_TITLE_SIZE = 24;
const BODY_SIZE = 22;
const BULLET_SIZE = 20;

const buildHeaderParagraphs = (resume: Resume): Paragraph[] => {
  const { name } = resume.header;
  const { line1, line2 } = getHeaderContactPlainLines(resume.header);
  const paragraphs: Paragraph[] = [
    new Paragraph({
      children: [new TextRun({ text: name || 'Resume', bold: true, size: NAME_SIZE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
  ];

  if (line1.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: line1.join('  •  '), size: CONTACT_SIZE })],
        alignment: AlignmentType.CENTER,
        spacing: { after: line2.length > 0 ? 40 : 200 },
      })
    );
  }
  if (line2.length > 0) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: line2.join('  •  '), size: CONTACT_SIZE })],
        alignment: AlignmentType.CENTER,
        spacing: { after: 200 },
      })
    );
  }

  return paragraphs;
};

const sectionTitle = (sectionName: string): Paragraph =>
  new Paragraph({
    children: [new TextRun({ text: sectionName.toUpperCase(), bold: true, size: SECTION_TITLE_SIZE })],
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: '000000' },
    },
    spacing: { before: 120, after: 48 },
  });

const entryTitleTabStops = [{ position: TabStopPosition.MAX, type: TabStopType.RIGHT }];

const buildStandardSectionParagraphs = (section: StandardSection): Paragraph[] => {
  const paragraphs: Paragraph[] = [sectionTitle(section.sectionName)];
  const isProject = normalizeSectionName(section.sectionName) === 'projects';
  const isEducation = normalizeSectionName(section.sectionName) === 'education';

  for (const entry of section.entries) {
    if (
      !getEntryPrimaryText(entry, section.sectionName) &&
      !getEntrySecondaryText(entry, section.sectionName) &&
      !getEntryDateText(entry) &&
      entry.bulletPoints.every((b) => !b.trim())
    ) {
      continue;
    }

    const primary = getEntryPrimaryText(entry, section.sectionName);
    const secondary = getEntrySecondaryText(entry, section.sectionName);
    const dates = getEntryDateText(entry);

    if (isProject) {
      const runs: TextRun[] = [
        new TextRun({ text: primary, bold: true, size: BODY_SIZE }),
      ];
      if (secondary) {
        runs.push(new TextRun({ text: ' | ', size: BODY_SIZE }));
        runs.push(new TextRun({ text: secondary, italics: true, size: BODY_SIZE }));
      }
      runs.push(new TextRun({ text: `\t${dates}`, size: BODY_SIZE }));
      paragraphs.push(
        new Paragraph({
          children: runs,
          tabStops: entryTitleTabStops,
          spacing: { before: 48, after: 24 },
        })
      );
    } else {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({ text: primary, bold: true, size: BODY_SIZE }),
            new TextRun({ text: `\t${dates}`, size: BODY_SIZE }),
          ],
          tabStops: entryTitleTabStops,
          spacing: { before: 48, after: 12 },
        })
      );
      if (secondary) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: secondary, italics: true, size: BODY_SIZE })],
            spacing: { after: 24 },
          })
        );
      }
      if (isEducation) {
        const educationMeta = getEducationMetaParts(entry).join(' · ');
        if (educationMeta) {
          paragraphs.push(
            new Paragraph({
              children: [new TextRun({ text: educationMeta, size: BULLET_SIZE })],
              spacing: { after: 24 },
            })
          );
        }
      }
      const coursework = (entry.coursework ?? []).map((item) => item.trim()).filter(Boolean);
      if (coursework.length > 0) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Coursework: ${coursework.join(', ')}`,
                italics: true,
                size: BULLET_SIZE,
              }),
            ],
            spacing: { after: 24 },
          })
        );
      }
    }

    for (const bullet of entry.bulletPoints.filter((b) => b.trim())) {
      paragraphs.push(
        new Paragraph({
          bullet: { level: 0 },
          spacing: { after: 16 },
          children: [new TextRun({ text: bullet.trim(), size: BULLET_SIZE })],
        })
      );
    }
  }

  return paragraphs;
};

const buildSkillsSectionParagraphs = (section: SkillsSection): Paragraph[] => {
  const paragraphs: Paragraph[] = [sectionTitle(section.sectionName)];

  for (const category of section.categories) {
    if (!category.categoryName && category.skills.length === 0) continue;
    const skillsText = category.skills.filter(Boolean).join(', ');
    if (!skillsText) continue;
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({ text: `${category.categoryName}: `, bold: true, size: BULLET_SIZE }),
          new TextRun({ text: skillsText, size: BULLET_SIZE }),
        ],
        spacing: { after: 24 },
      })
    );
  }

  return paragraphs;
};

const sectionToParagraphs = (section: Section): Paragraph[] => {
  if (section.type === 'standard') return buildStandardSectionParagraphs(section);
  return buildSkillsSectionParagraphs(section);
};

const buildDocxDocument = (resume: Resume): Document => {
  const sortedSections = [...resume.sections].sort((a, b) => a.order - b.order);
  const headerParagraphs = buildHeaderParagraphs(resume);
  const sectionParagraphs = sortedSections.flatMap(sectionToParagraphs);

  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720,
              right: 720,
              bottom: 720,
              left: 720,
            },
          },
        },
        children: [...headerParagraphs, ...sectionParagraphs],
      },
    ],
  });
};

export const downloadDocx = async (resume: Resume): Promise<void> => {
  const doc = buildDocxDocument(resume);
  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `resume-${new Date().toISOString().split('T')[0]}.docx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
