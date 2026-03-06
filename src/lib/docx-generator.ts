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

const NAME_SIZE = 40;
const CONTACT_SIZE = 22;
const SECTION_TITLE_SIZE = 24;
const BODY_SIZE = 22;
const BULLET_SIZE = 20;

const buildHeaderParagraphs = (resume: Resume): Paragraph[] => {
  const { name, email, phone, linkedIn, github } = resume.header;
  const contactParts: string[] = [];
  if (email) contactParts.push(email);
  if (phone) contactParts.push(phone);
  if (linkedIn) contactParts.push(linkedIn);
  if (github) contactParts.push(github);
  const contactLine = contactParts.join('  •  ');

  return [
    new Paragraph({
      children: [new TextRun({ text: name || 'Resume', bold: true, size: NAME_SIZE })],
      alignment: AlignmentType.CENTER,
      spacing: { after: 60 },
    }),
    ...(contactLine
      ? [
          new Paragraph({
            children: [new TextRun({ text: contactLine, size: CONTACT_SIZE })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
        ]
      : []),
  ];
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
  const isProject = section.sectionName.toLowerCase().includes('project');

  for (const entry of section.entries) {
    if (!entry.title && !entry.organization && !entry.dateRange && entry.bulletPoints.every((b) => !b.trim())) continue;

    if (isProject) {
      const runs: TextRun[] = [
        new TextRun({ text: entry.title, bold: true, size: BODY_SIZE }),
      ];
      if (entry.organization?.trim()) {
        runs.push(new TextRun({ text: ' | ', size: BODY_SIZE }));
        runs.push(new TextRun({ text: entry.organization, italics: true, size: BODY_SIZE }));
      }
      runs.push(new TextRun({ text: `\t${entry.dateRange ?? ''}`, size: BODY_SIZE }));
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
            new TextRun({ text: entry.title, bold: true, size: BODY_SIZE }),
            new TextRun({ text: `\t${entry.dateRange ?? ''}`, size: BODY_SIZE }),
          ],
          tabStops: entryTitleTabStops,
          spacing: { before: 48, after: 12 },
        })
      );
      if (entry.organization?.trim()) {
        paragraphs.push(
          new Paragraph({
            children: [new TextRun({ text: entry.organization, italics: true, size: BODY_SIZE })],
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
