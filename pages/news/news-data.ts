import NewsCover1 from '@/assets/media/home/news-1.jpg';
import NewsCover2 from '@/assets/media/home/news-2.jpg';
import NewsCover3 from '@/assets/media/home/news-3.jpg';

export interface DemoNewsArticle {
  slug: string;
  title: string;
  date: string;
  cover: string;
  excerpt: string;
  body: string;
}

export const demoNewsArticles: DemoNewsArticle[] = [
  {
    slug: 'nexperia-mosfets',
    title: 'Nexperia launches hot-swap application-specific MOSFETs (ASFE)',
    date: '29 OCT 2024',
    cover: NewsCover1,
    excerpt: 'New ASFE devices target hot-swap and power-path protection in industrial and telecom designs.',
    body: 'Nexperia has expanded its portfolio with application-specific MOSFETs optimized for hot-swap controllers. The ASFE family offers lower RDS(on) in compact packages, helping engineers reduce board space while improving inrush current handling in 48 V and 12 V rails.',
  },
  {
    slug: 'analog-lead-times',
    title: 'Analog Devices expands allocation for industrial interface ICs',
    date: '12 OCT 2024',
    cover: NewsCover2,
    excerpt: 'Lead times are improving across isolated transceivers and precision ADC lines used in factory automation.',
    body: 'Analog Devices reported broader allocation for several industrial interface families, including isolated RS-485 transceivers and precision sigma-delta ADCs. Distributors are seeing steadier replenishment cycles, which should ease BOM risk for multi-year automation programs.',
  },
  {
    slug: 'passive-stock',
    title: 'Passives lead times stabilize across high-volume MLCC lines',
    date: '03 OCT 2024',
    cover: NewsCover3,
    excerpt: 'High-capacitance MLCCs in standard case sizes are returning to predictable delivery windows.',
    body: 'After several quarters of volatility, MLCC supply for common 0402 and 0603 values has normalized. Portfolio buyers are shifting from emergency spot buys to quarterly releases, with pricing holding flat across most commodity ratings.',
  },
  {
    slug: 'connector-standards',
    title: 'USB-C receptacles now qualified for extended temperature ranges',
    date: '18 SEP 2024',
    cover: NewsCover2,
    excerpt: 'New connector families support -40 °C to +105 °C operation for outdoor and automotive accessory designs.',
    body: 'Several connector manufacturers have released USB-C receptacles tested beyond consumer temperature grades. The parts target kiosk, fleet, and industrial HMI applications where repeated mating cycles and environmental stress are design constraints.',
  },
];

export function findDemoNewsArticle(slug: string): DemoNewsArticle | undefined {
  return demoNewsArticles.find((article) => article.slug === slug);
}
