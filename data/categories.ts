interface BaseEntity {
  _id: string;
  uuid: string;
  createdBy: string;
  deleted: boolean;
  name: string;
  description: string;
  status: 'published' | 'unpublished';
  parentId: string;
}

export interface CategoryItem extends BaseEntity {
  img?: string; // Optional image property for items
}

export interface Subcategory extends BaseEntity {
  icon: string;
  items: CategoryItem[]; // Subcategories contain CategoryItems
}

export interface Category extends BaseEntity {
  icon: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
  items: Subcategory[]; // Categories contain Subcategories
}

export const categories = [
  {
    _id: '6640cce35fbc8c0fd9f7ed05',
    uuid: 'c3d2573a-3fd2-43b8-81c3-c804c2d32341',
    createdBy: '663cb52cde9457dbecd7dc3d',
    deleted: false,
    name: 'Semiconductors',
    icon: 'GavelIcon',
    description: 'MCUs, logic, and mixed-signal ICs',
    status: 'published',
    createdAt: '2024-05-12T14:06:27.570Z',
    updatedAt: '2024-05-12T14:06:27.570Z',
    __v: 0,
    items: [
      {
        _id: '6640d32a5fbc8c0fd9f7ed1a',
        uuid: 'dc07cd9b-92d8-472d-a755-f31047a9369b',
        createdBy: '663cb52cde9457dbecd7dc3d',
        deleted: false,
        name: 'Microcontrollers',
        icon: 'Gem',
        description: 'This is a subcategory.',
        status: 'unpublished',
        parentId: '6640cce35fbc8c0fd9f7ed05',
        items: [
          {
            _id: '6640db375fbc8c0fd9f7ed66',
            uuid: '9c61c4b9-348d-408f-90e0-dc72c7e57700',
            createdBy: '663cb52cde9457dbecd7dc3d',
            deleted: false,
            name: 'ARM Cortex-M4',
            img: 'https://picsum.photos/200',
            description: 'This is a subcategory item.',
            status: 'published',
            parentId: '6640d32a5fbc8c0fd9f7ed1a',
          },
        ],
      },
    ],
  },
  {
    _id: '6640cce35fbc8c0fd9f7ed06',
    uuid: 'eae739f4-55f4-4f57-bf82-b90f7587639b',
    createdBy: '663cb52cde9457dbecd7dc3d',
    deleted: false,
    name: 'Passives',
    icon: 'BookIcon',
    description: 'Resistors, capacitors, and magnetics',
    status: 'unpublished',
    createdAt: '2024-05-15T09:20:32.570Z',
    updatedAt: '2024-05-15T09:20:32.570Z',
    __v: 0,
    items: [
      {
        _id: '6640d32a5fbc8c0fd9f7ed1b',
        uuid: 'ee07cd9b-12d8-43b8-9134-11047a94011b',
        createdBy: '663cb52cde9457dbecd7dc3d',
        deleted: false,
        name: 'Diodes',
        icon: 'ArchiveIcon',
        description: 'This is another subcategory.',
        status: 'published',
        parentId: '6640cce35fbc8c0fd9f7ed06',
        items: [
          {
            _id: '6640db375fbc8c0fd9f7ed67',
            uuid: 'c961c5c1-251d-4519-85a2-bc85c4e5768c',
            createdBy: '663cb52cde9457dbecd7dc3d',
            deleted: false,
            name: 'Subcategory Item 2',
            img: 'https://picsum.photos/200',
            description: 'This is another subcategory item.',
            status: 'unpublished',
            parentId: '6640d32a5fbc8c0fd9f7ed1b',
          },
          {
            _id: '6640db375fbc8c0fd9f7ed68',
            uuid: 'd661c7a1-442d-4229-b90f-cc82d7f57788',
            createdBy: '663cb52cde9457dbecd7dc3d',
            deleted: false,
            name: 'Subcategory Item 3',
            img: 'https://picsum.photos/200',
            description: 'A subcategory item with a different status.',
            status: 'published',
            parentId: '6640d32a5fbc8c0fd9f7ed1b',
          },
        ],
      },
    ],
  },
  {
    _id: '6640cce35fbc8c0fd9f7ed07',
    uuid: 'f4d38273-2b43-41a4-876f-f19464b68f78',
    createdBy: '663cb52cde9457dbecd7dc3d',
    deleted: false,
    name: 'Connectors',
    icon: 'FolderIcon',
    description: 'Board-to-board and wire-to-board connectors',
    status: 'published',
    createdAt: '2024-05-18T17:05:22.570Z',
    updatedAt: '2024-05-18T17:05:22.570Z',
    __v: 0,
    items: [
      {
        _id: '6640d32a5fbc8c0fd9f7ed1c',
        uuid: 'aa47cd9b-39b1-4829-8334-61047a9511cc',
        createdBy: '663cb52cde9457dbecd7dc3d',
        deleted: false,
        name: 'Headers',
        icon: 'StarIcon',
        description: 'This subcategory belongs to the third category.',
        status: 'unpublished',
        parentId: '6640cce35fbc8c0fd9f7ed07',
        items: [],
      },
      {
        _id: '6640d32a5fbc8c0fd9f7ed1d',
        uuid: 'ca87de9b-81d2-489e-b131-d6109d241122',
        createdBy: '663cb52cde9457dbecd7dc3d',
        deleted: false,
        name: 'USB & I/O',
        icon: 'TagIcon',
        description: 'Another subcategory in Category 3.',
        status: 'published',
        parentId: '6640cce35fbc8c0fd9f7ed07',
        items: [
          {
            _id: '6640db375fbc8c0fd9f7ed69',
            uuid: 'b961c8b9-581d-4d2b-9b33-de72e7f578a0',
            createdBy: '663cb52cde9457dbecd7dc3d',
            deleted: false,
            name: 'Subcategory Item 4',
            img: 'https://picsum.photos/200',
            description: 'This is the fourth subcategory item.',
            status: 'published',
            parentId: '6640d32a5fbc8c0fd9f7ed1d',
          },
        ],
      },
    ],
  },
];
