import { Resume } from '@/types/resume';

// Sample resume data with prefilled content for demonstration
// Using static IDs to prevent hydration mismatch between server and client
export const createSampleResume = (): Resume => ({
  id: 'sample-resume-001',
  header: {
    name: 'Alex Johnson',
    email: 'alex.johnson@email.com',
    phone: '(555) 123-4567',
    linkedIn: 'https://linkedin.com/in/alexjohnson',
    github: 'https://github.com/alexjohnson',
    useIcons: true,
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
          organization: 'Bachelor of Science in Computer Science',
          dateRange: 'May 2019',
          bulletPoints: [
            'Relevant Coursework: Data Structures, Algorithms, Database Systems, Web Development, Machine Learning',
          ],
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
          organization: 'Senior Software Engineer',
          dateRange: 'Jan 2022 -- Present',
          bulletPoints: [
            'Led development of microservices architecture serving 1M+ daily active users, reducing latency by 40%',
            'Mentored team of 5 junior developers, improving code review efficiency and reducing bug rate by 25%',
            'Implemented CI/CD pipeline reducing deployment time from 2 hours to 15 minutes',
          ],
        },
        {
          id: 'entry-exp-002',
          title: 'Startup Labs',
          organization: 'Software Engineer',
          dateRange: 'Jun 2019 -- Dec 2021',
          bulletPoints: [
            'Built RESTful APIs using Node.js and Express, handling 50K requests per minute with 99.9% uptime',
            'Developed responsive web applications using React and TypeScript for 100K+ monthly users',
            'Collaborated with product team to define technical requirements and deliver features on schedule',
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
          title: 'E-Commerce Platform',
          organization: 'Next.js, PostgreSQL, Stripe, Tailwind CSS',
          dateRange: '',
          bulletPoints: [
            'Full-stack e-commerce application with user authentication, shopping cart, and payment processing',
            'Implemented server-side rendering for SEO optimization, achieving 95+ Lighthouse score',
            'Deployed on Vercel with automated CI/CD, handling 10K+ monthly transactions',
          ],
        },
        {
          id: 'entry-proj-002',
          title: 'Real-time Chat Application',
          organization: 'React, Socket.io, Node.js, MongoDB',
          dateRange: '',
          bulletPoints: [
            'Built real-time messaging platform supporting 1000+ concurrent users with WebSocket connections',
            'Implemented end-to-end encryption for secure message transmission',
            'Added features including group chats, file sharing, and message search functionality',
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

// Template-specific sample data can be added here
export const templateSampleData: Record<string, () => Resume> = {
  classic: createSampleResume,
  // Add more templates with their sample data here
};

export const getSampleDataForTemplate = (templateId: string): Resume => {
  const createData = templateSampleData[templateId] || createSampleResume;
  return createData();
};
