import MicrochipLogo from '@/assets/media/home/microchip.png';
import TDKLogo from '@/assets/media/home/tdk.png';
import DigiKeyLogo from '@/assets/media/home/digi-key.png';
import QuectelLogo from '@/assets/media/home/quectel.png';
import MaximIntegratedLogo from '@/assets/media/home/maxim-integrated.png';
import TrestonLogo from '@/assets/media/home/treston.png';
import TexasInstrumentsLogo from '@/assets/media/home/texas-instruments.png';

export interface DemoManufacturer {
  name: string;
  logo: string;
  category: string;
}

export const demoManufacturers: DemoManufacturer[] = [
  { name: 'Microchip', logo: MicrochipLogo, category: 'Microcontrollers & analog' },
  { name: 'TDK', logo: TDKLogo, category: 'Passives & sensors' },
  { name: 'Digi-Key', logo: DigiKeyLogo, category: 'Authorized distribution' },
  { name: 'Quectel', logo: QuectelLogo, category: 'Wireless modules' },
  { name: 'Maxim Integrated', logo: MaximIntegratedLogo, category: 'Power & interface ICs' },
  { name: 'Treston', logo: TrestonLogo, category: 'Workplace & ESD solutions' },
  { name: 'Texas Instruments', logo: TexasInstrumentsLogo, category: 'Analog & embedded processing' },
];
