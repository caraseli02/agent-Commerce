export default defineEventHandler(async () => {
  return {
    status: 'success',
    data: [
      {
        _id: 'cat-1',
        name: 'Semiconductors',
        alias: 'semiconductors',
        path: 'semiconductors',
        description: 'MCUs, logic, and mixed-signal ICs',
        active: true,
        children: [
          {
            _id: 'cat-1-1',
            name: 'Microcontrollers',
            alias: 'microcontrollers',
            path: 'semiconductors/microcontrollers',
            active: true,
          },
          {
            _id: 'cat-1-2',
            name: 'Interface ICs',
            alias: 'interface-ics',
            path: 'semiconductors/interface-ics',
            active: true,
          },
          {
            _id: 'cat-1-3',
            name: 'Power Management',
            alias: 'power-management',
            path: 'semiconductors/power-management',
            active: true,
          },
        ],
      },
      {
        _id: 'cat-2',
        name: 'Passives',
        alias: 'passives',
        path: 'passives',
        description: 'Resistors, capacitors, and magnetics',
        active: true,
        children: [
          {
            _id: 'cat-2-1',
            name: 'Diodes',
            alias: 'diodes',
            path: 'passives/diodes',
            active: true,
          },
          {
            _id: 'cat-2-2',
            name: 'Capacitors',
            alias: 'capacitors',
            path: 'passives/capacitors',
            active: true,
          },
        ],
      },
      {
        _id: 'cat-3',
        name: 'Connectors',
        alias: 'connectors',
        path: 'connectors',
        description: 'Board-to-board and wire-to-board connectors',
        active: true,
        children: [
          {
            _id: 'cat-3-1',
            name: 'Headers',
            alias: 'headers',
            path: 'connectors/headers',
            active: true,
          },
          {
            _id: 'cat-3-2',
            name: 'USB & I/O',
            alias: 'usb-io',
            path: 'connectors/usb-io',
            active: true,
          },
        ],
      },
    ],
  };
});
