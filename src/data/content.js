// Semua konten di file ini adalah placeholder. Ganti teks & gambar dengan milikmu.
const P = '/placeholders';

export const site = {
  brand: 'LoremDev.',
  footerBrand: 'Lorem.dev',
  footerTagline:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore.',
  copyright: 'LoremDev. All rights reserved.',
};

export const socials = [
  { key: 'github', label: 'GitHub', handle: '@loremipsum', url: '#', logo: `${P}/github.svg` },
  { key: 'instagram', label: 'Instagram', handle: '@lorem_ipsum', url: '#', logo: `${P}/instagram.svg` },
  { key: 'tiktok', label: 'TikTok', handle: '@dolor_sit', url: '#', logo: `${P}/tiktok.svg` },
];

export const lanyardAssets = {
  front: `${P}/card-front.svg`,
  frontMobile: `${P}/card-front.svg`,
  back: `${P}/card-back.svg`,
  backMobile: `${P}/card-back.svg`,
  strap: `${P}/strap.svg`,
};

export const hero = {
  headingGradient: 'Lorem ipsum',
  headingWhite: 'Dolor Sit Amet',
  roles: ['Lorem Ipsum Dolor', 'Consectetur Adipiscing', 'Sed Do Eiusmod', 'Tempor Incididunt'],
  description:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse.',
};

export const about = {
  greeting: "Hi, I'm",
  firstLine: 'Lorem',
  secondLine: 'Ipsum Dolor',
  portrait: `${P}/portrait.svg`,
  portraitAlt: `${P}/portrait-alt.svg`,
  portraitAltMobile: `${P}/portrait-alt.svg`,
  bioLead: 'Lorem ipsum ',
  bioStrong: 'Dolor Sit Amet',
  bioRest:
    ' consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco.',
  bio2:
    'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur, excepteur sint occaecat cupidatat.',
};

export const education = [
  { name: 'Lorem Ipsum Dolor', detail: 'Consectetur Adipiscing', date: '2024 – 2027', logo: `${P}/logo-1.svg` },
  { name: 'Sit Amet Consectetur', detail: 'Sed Do Eiusmod', date: '2021 – 2024', logo: `${P}/logo-2.svg` },
];

export const experience = [
  { name: 'Lorem Ipsum Amet', detail: 'Dolor Sit', logo: `${P}/logo-3.svg` },
];

export const spotify = {
  titleTop: 'Lorem ipsum.',
  titleBottom: 'Dolor sit amet.',
  description:
    'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
  linkLabel: 'Lorem Ipsum di Spotify',
  url: '#',
  playlist: {
    title: 'Lorem Ipsum',
    owner: 'Dolor Sit',
    cover: `${P}/cover.svg`,
    tracks: [
      { title: 'Lorem Ipsum', artist: 'Dolor Sit', duration: '03:20' },
      { title: 'Consectetur Adipiscing', artist: 'Sed Do', duration: '03:55' },
      { title: 'Eiusmod Tempor', artist: 'Incididunt Ut', duration: '03:51' },
      { title: 'Labore Et Dolore', artist: 'Magna Aliqua', duration: '04:12' },
      { title: 'Ut Enim Ad Minim', artist: 'Veniam Quis', duration: '02:58' },
    ],
  },
};

const tags = ['HTML', 'CSS', 'JavaScript', 'React', 'Vite', 'VScode'];

export const projects = [
  {
    id: 'lorem-ipsum',
    title: 'Lorem Ipsum',
    categoryLabel: 'Lorem',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #0369a1 50%, #0284c7 100%)',
    image: `${P}/project-1.svg`,
    description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
    longDesc:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.',
    tags,
  },
  {
    id: 'dolor-sit',
    title: 'Dolor Sit Amet',
    categoryLabel: 'Ipsum',
    gradient: 'linear-gradient(135deg, #091e3a 0%, #1e3a8a 50%, #3b82f6 100%)',
    image: `${P}/project-2.svg`,
    description:
      'Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat duis aute irure dolor.',
    longDesc:
      'Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.',
    tags,
  },
  {
    id: 'consectetur',
    title: 'Consectetur',
    categoryLabel: 'Dolor',
    gradient: 'linear-gradient(135deg, #091e3a 0%, #1e3a8a 50%, #3b82f6 100%)',
    image: `${P}/project-3.svg`,
    description: 'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque.',
    longDesc:
      'Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.',
    tags,
  },
];

export const skills = [
  'Lorem', 'Ipsum', 'Dolor', 'Sit Amet', 'Consectetur', 'Adipiscing',
  'Elit Sed', 'Eiusmod', 'Tempor', 'Incididunt', 'Labore', 'Magna',
].map((name, i) => ({ name, logo: `${P}/tech-${i + 1}.svg` }));

export const certificates = [
  { id: 'cert-1', title: 'Lorem Ipsum', image: `${P}/certificate-1.svg` },
  { id: 'cert-2', title: 'Dolor Sit', image: `${P}/certificate-2.svg` },
  { id: 'cert-3', title: 'Amet Consectetur', image: `${P}/certificate-3.svg` },
];

export const awards = [
  {
    id: 'award-1',
    title: 'Lorem Ipsum Dolor',
    event: 'Consectetur Adipiscing Elit',
    year: '2024',
    image: `${P}/award-1.svg`,
  },
];

export const stats = [
  { key: 'projects', label: 'Projects', detail: 'Lorem ipsum dolor', value: String(projects.length) },
  { key: 'certificates', label: 'Certificates', detail: 'Sit amet consectetur', value: String(certificates.length) },
  { key: 'awards', label: 'Awards', detail: 'Adipiscing elit sed', value: String(awards.length) },
];

export const contact = {
  intro: 'Lorem ipsum dolor sit amet? Consectetur adipiscing elit...',
};

const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();

export const seedComments = [
  { id: 'seed-1', name: 'Lorem', message: 'Lorem ipsum dolor sit amet', photo: null, createdAt: minutesAgo(25) },
  { id: 'seed-2', name: 'Ipsum', message: 'Consectetur adipiscing elit', photo: null, createdAt: minutesAgo(60) },
  { id: 'seed-3', name: 'Dolor', message: 'Sed do eiusmod', photo: null, createdAt: minutesAgo(180) },
  { id: 'seed-4', name: 'Sit Amet', message: 'Ut enim ad minim veniam, quis nostrud exercitation', photo: null, createdAt: minutesAgo(240) },
  { id: 'seed-5', name: 'Consectetur', message: 'Duis aute irure dolor', photo: null, createdAt: minutesAgo(300) },
];
