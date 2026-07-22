export interface LeafletMapDataFeature {
  type: 'Feature';
  id?: string;
  properties: {
    name: string;
  };
  geometry: {
    type: 'MultiPolygon' | 'Polygon';
    coordinates: Array<Array<[number, number]>> | Array<Array<Array<[number, number]>>>;
  };
}

export interface LeafletMapDataType {
  type: 'FeatureCollection';
  features: LeafletMapDataFeature[];
}

export interface CountryReference {
  label: string;
  value: string;
  icon: string;
  regions: {
    name: string;
    shortCode: string;
  }[];
}
