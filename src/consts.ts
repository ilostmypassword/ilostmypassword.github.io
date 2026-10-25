export const SITE = {
  title: 'h3ik0',
  tagline: 'Cyber Defense Engineer & Offensive Security Researcher',
  description:
    'Writeups, research and field notes from a cyber defense engineer, bug hunter and CTF player.',
  author: 'h3ik0',
  about:
    'Hello human, I am h3ik0, a Cyber Defense Engineer by day and an Offensive Security Researcher by night. I build Melissae, a honeypot framework, hunt bugs on YesWeHack and play CTFs.',
  // Quote shown in the left sidebar.
  quote: {
    text: 'Fervor is the weapon of choice for the impotent.',
    author: 'Frantz Fanon',
  },
  location: 'France',
  email: 'h3ik0_0@protonmail.com',
  // Short mono line under the name in the sidebar.
  focus: ['aka veronique92'],
  links: {
    github: 'https://github.com/ilostmypassword',
    yeswehack: 'https://yeswehack.com/hunters/veronique92',
    melissae: 'https://github.com/ilostmypassword/Melissae-Honeypot-Framework',
    melissaeDocs: 'https://melissae-documentation.readthedocs.io',
  },
};

// Shown in the left sidebar. Add an entry here to add a link to every page.
// `icon` must be one of: github, yeswehack, rss, mail.
export const SOCIALS: { label: string; href: string; icon: 'github' | 'yeswehack' | 'rss' | 'mail' }[] = [
  { label: 'GitHub', href: SITE.links.github, icon: 'github' },
  { label: 'YesWeHack', href: SITE.links.yeswehack, icon: 'yeswehack' },
  { label: 'Email', href: `mailto:${SITE.email}`, icon: 'mail' },
];

// Public PGP key. Served as a download at /h3ik0.asc (src/pages/h3ik0.asc.ts)
// and shown on the About page.
export const PGP = {
  fingerprint: '8889 6AFC 08D9 23BD 90C9  0540 1A77 B1C8 C4AD FEB6',
  file: '/h3ik0.asc',
  key: `-----BEGIN PGP PUBLIC KEY BLOCK-----

mDMEat3ltxYJKwYBBAHaRw8BAQdA8tlY2e6ZX/FGP2LwlH63Xe3AvKnbmlPWOsSo
bmYSemS0HmgzaWswIDxoM2lrMF8wQHByb3Rvbm1haWwuY29tPoiTBBMWCgA7FiEE
iIlq/AjZI72QyQVAGnexyMSt/rYFAmrd5bcCGwMFCwkIBwICIgIGFQoJCAsCBBYC
AwECHgcCF4AACgkQGnexyMSt/rby7wEApAG8PYuMBk8WzKQiKJn/FFeG7Y1IYnss
39zusSP/y3gA/AvHB/06PSo+4i5pGUyInMKSnc9csKiBO4CLtO4RyuAEuDgEat3l
txIKKwYBBAGXVQEFAQEHQDIVMh1Air11RiNhs/Bp8J4H7itFZX58eTOeP3XFOWlK
AwEIB4h4BBgWCgAgFiEEiIlq/AjZI72QyQVAGnexyMSt/rYFAmrd5bcCGwwACgkQ
GnexyMSt/rZDywEA+5FcJj6vBsaZVE3szpycfud3KHb3Hi72tNCioOCottsBAP5/
bZrRW4Bt77GTZksPo8433px9d4c/JuFL9nKt8tUH
=7iiU
-----END PGP PUBLIC KEY BLOCK-----
`,
};

// Bug Bounty Hall of Fame on the home page (same logos as the GitHub profile).
// `logo` can be a remote URL or a path under public/ (e.g. '/logos/alibaba.png').
export const HALL_OF_FAME: { name: string; logo: string }[] = [
  { name: 'Alibaba', logo: 'https://logos-marques.com/wp-content/uploads/2021/03/Alibaba-Logo.png' },
  { name: 'TAG Heuer', logo: 'https://logos-world.net/wp-content/uploads/2024/10/TAG-Heuer-Logo.png' },
  {
    name: 'Free Mobile',
    logo: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/1d/Free_mobile_2011.svg/1280px-Free_mobile_2011.svg.png',
  },
];

// Music player in the left sidebar. Drop audio files in public/music/ and
// list them here. Empty playlist hides the player entirely.
export const MUSIC = {
  volume: 0.7,
  playlist: [
    { name: 'Again', artist: 'Remilia Bandxz', url: '/music/Again.mp3' },
    { name: 'Fra Midt Til Slutning II', artist: 'Mischa Pavlovski', url: '/music/FraMidtTilSlutning_II.mp3' },
    { name: 'Pretty Girls Love Corn', artist: 'Useraangeltearzz', url: '/music/PrettyGirlsLoveCorn.mp3' },
    { name: 'Rhubarb', artist: 'Aphex Twin', url: '/music/Rhubarb.mp3' },
  ] as { name: string; artist: string; url: string }[],
};

export const KINDS = {
  writeup: 'CTF writeup',
  research: 'Research',
  bounty: 'Bug bounty',
  note: 'Note',
} as const;

export type Kind = keyof typeof KINDS;
