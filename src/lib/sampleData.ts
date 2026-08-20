import { CURRENT_SCHEMA_VERSION, type Resume } from '@/types/resume';

export const createSampleResume = (): Resume => ({
  schemaVersion: CURRENT_SCHEMA_VERSION,
  id: 'sample-resume-001',
  header: {
    name: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    phone: '(555) 123-4567',
    location: 'San Jose, CA',
    linkedIn: 'https://linkedin.com/in/alexjohnson',
    github: 'https://github.com/alexjohnson',
    website: 'https://alexjohnson.dev',
    workAuthorization: 'Eligible for CPT',
    iconMode: 'icon-and-text',
  },
  sections: [
    {
      id: 'section-education-001',
      type: 'standard',
      sectionName: 'Education',
      order: 0,
      entries: [
        {
          id: 'entry-edu-001',
          title: 'State University',
          organization: 'State University',
          role: 'B.S. Computer Science',
          dates: { start: '2023-09', end: '2027-05' },
          expectedGraduation: '2027-05',
          gpa: 3.8,
          coursework: [
            'Data Structures',
            'Algorithms',
            'Database Systems',
            'Web Development',
            'Machine Learning',
          ],
          bulletPoints: [],
        },
      ],
    },
    {
      id: 'section-experience-001',
      type: 'standard',
      sectionName: 'Experience',
      order: 1,
      entries: [
        {
          id: 'entry-exp-001',
          title: 'Tech Company Inc.',
          organization: 'Tech Company Inc.',
          role: 'Software Engineering Intern',
          location: 'San Jose, CA',
          dates: { start: '2025-06', end: '2025-08' },
          bulletPoints: [
            'Built internal tooling that cut review time by 25% across a 5-person intern pod',
            'Shipped a CI check that caught 12 production-blocking type errors before merge',
          ],
        },
        {
          id: 'entry-exp-002',
          title: 'Startup Labs',
          organization: 'Startup Labs',
          role: 'Software Engineering Intern',
          location: 'Remote',
          dates: { start: '2024-06', end: '2024-08' },
          bulletPoints: [
            'Built REST APIs in Node.js handling 50K requests per minute with 99.9% uptime',
            'Shipped React/TypeScript UI used by 100K+ monthly users',
          ],
        },
      ],
    },
    {
      id: 'section-projects-001',
      type: 'standard',
      sectionName: 'Projects',
      order: 2,
      entries: [
        {
          id: 'entry-proj-001',
          title: 'Campus Course Planner',
          organization: '',
          dates: { start: '2024-09', end: '2025-03' },
          techStack: ['Next.js', 'PostgreSQL', 'Stripe', 'Tailwind CSS'],
          links: [{ label: 'repo', url: 'https://github.com/alexjohnson/course-planner' }],
          bulletPoints: [
            'Full-stack planner with auth, waitlist tracking, and schedule export',
            'Server-side rendering for SEO, 95+ Lighthouse performance',
          ],
        },
        {
          id: 'entry-proj-002',
          title: 'Realtime Study Group Chat',
          organization: '',
          dates: { start: '2024-01', end: '2024-05' },
          techStack: ['React', 'Socket.io', 'Node.js', 'MongoDB'],
          links: [{ label: 'demo', url: 'https://chat.alexjohnson.dev' }],
          bulletPoints: [
            'Websocket rooms supporting 1000+ concurrent users',
            'Group chats, file sharing, and message search',
          ],
        },
      ],
    },
    {
      id: 'section-skills-001',
      type: 'skills',
      sectionName: 'Technical Skills',
      order: 3,
      categories: [
        {
          id: 'cat-skills-001',
          categoryName: 'Languages',
          skills: ['JavaScript', 'TypeScript', 'Python', 'Java', 'SQL', 'HTML/CSS'],
        },
        {
          id: 'cat-skills-002',
          categoryName: 'Front-end',
          skills: ['React', 'Next.js', 'Vue.js', 'Tailwind CSS', 'Redux'],
        },
        {
          id: 'cat-skills-003',
          categoryName: 'Back-end',
          skills: ['Node.js', 'Express', 'Django', 'FastAPI', 'GraphQL'],
        },
        {
          id: 'cat-skills-004',
          categoryName: 'Databases & ORMs',
          skills: ['PostgreSQL', 'MongoDB', 'Redis', 'Prisma', 'Mongoose'],
        },
        {
          id: 'cat-skills-005',
          categoryName: 'DevOps & Infrastructure',
          skills: ['Docker', 'AWS', 'Vercel', 'GitHub Actions', 'Linux'],
        },
        {
          id: 'cat-skills-006',
          categoryName: 'Tools & Platforms',
          skills: ['Git', 'VS Code', 'Figma', 'Postman', 'Jira'],
        },
      ],
    },
  ],
  lastModified: new Date('2024-01-01T00:00:00.000Z'),
});

export const templateSampleData: Record<string, () => Resume> = {
  classic: createSampleResume,
};

export const getSampleDataForTemplate = (templateId: string): Resume => {
  const createData = templateSampleData[templateId] || createSampleResume;
  return createData();
};
