<template>
  <ClientOnly>
    <div class="rounded-xl w-full h-[244px] lg:h-[259px] xl:h-[316px]">
      <LMap
        id="mapid"
        ref="map"
        :zoom="zoom"
        :min-zoom="1"
        :max-zoom="5"
        :center="[51, 0]"
        :max-bounds="[
          [100.673, -200.023],
          [-60.995, 210.2421],
        ]"
        :options="{
          scrollWheelZoom: true,
          doubleClickZoom: true,
          zoomControl: false,
          attributionControl: false,
          minZoom: 1,
          maxZoom: 5,
        }"
        :use-global-leaflet="false"
      >
        <LControlZoom position="topright" />
        <LTileLayer url="" :no-wrap="true" />
        <LGeoJson
          v-if="geoJson"
          :geojson="geoJson"
          :options-style="style"
          :options="{
            onEachFeature: onEachFeature,
          }"
        />
        <LMarker v-if="tooltipCountry?.latLng" :lat-lng="[tooltipCountry.latLng.lat, tooltipCountry.latLng.lng]" :draggable="false">
          <!-- <LIcon :tooltip-anchor="[0, -5]" :icon-size="20" /> -->
          <LTooltip
            :options="{
              direction: 'top',
              permanent: false,
              sticky: true,
              offset: [0, 0],
              className: 'dashboard--map-tooltip',
            }"
            :content="`${tooltipCountry.label} <span class='font-semibold'>${tooltipCountry.count}</span>`"
          >
            {{ tooltipCountry.label }}
            <span class="font-semibold">
              {{ tooltipCountry.count }}
            </span>
          </LTooltip>
        </LMarker>
      </LMap>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import { LControlZoom, LGeoJson, LMap, LMarker, LTileLayer, LTooltip } from '@vue-leaflet/vue-leaflet';
import 'leaflet/dist/leaflet.css';
import type { PropType } from 'vue';
import { useGeoJson } from '~/composables/useGeoJson';

const { geoJson } = useGeoJson();

interface LeafletLayerEvent {
  target: { feature: { properties: { name: string } } };
  latlng: { lat: number; lng: number };
}

interface LeafletLayer {
  on: (handlers: { click: (e: LeafletLayerEvent) => void }) => void;
}

const props = defineProps({
  countries: {
    type: Array as PropType<
      {
        label: string;
        count: number;
        theme: string;
      }[]
    >,
    required: true,
  },
});

const zoom = ref(4);

const getColor = (countryName: string) => {
  const country = props.countries.find((country) => country.label === countryName);
  if (country) {
    return country.theme;
  } else {
    return '#D9D9D9';
  }
};
const style = (feature?: { properties?: { name?: string } }) => {
  const countryName = feature?.properties?.name ?? '';
  return {
    fillColor: getColor(countryName),
    fillOpacity: 1,
  };
};
const tooltipCountry = ref<(typeof props.countries)[number] & { latLng?: { lat: number; lng: number } }>();
const highlightFeatureClick = (e: LeafletLayerEvent) => {
  const clickedCountryName = e.target.feature.properties.name;
  const country = props.countries.find((c) => c.label === clickedCountryName);
  if (country) {
    tooltipCountry.value = { ...country, latLng: e.latlng };
  }
};
const onEachFeature = (feature: { properties?: { name?: string } }, layer: LeafletLayer) => {
  layer.on({
    click: highlightFeatureClick,
  });
};
</script>

<style>
@reference "../../assets/css/main.css";
.leaflet-container {
  @apply bg-[#F5FAFF] dark:bg-card rounded-xl overflow-hidden aspect-[2.3] xl:h-full xl:w-full;
  .leaflet-pane {
    z-index: 1;
  }
  .leaflet-top {
    z-index: 1;
  }
  .leaflet-interactive {
    @apply stroke-white dark:stroke-background fill-[#E2E2EA];
    stroke-width: 1px;
  }
  .dark & .leaflet-interactive[fill='#D9D9D9'] {
    fill: #3a3d46;
  }
  .leaflet-control {
    @apply mt-3.5 mr-3.5 flex flex-col gap-2 border-hidden;
    a {
      @apply flex items-center justify-center w-[26px] h-[26px] border-none bg-muted rounded text-muted-foreground transition-colors duration-300 font-medium hover:text-blue-500;
      @media (pointer: coarse) {
        display: block !important;
      }
      &.leaflet-disabled {
        @apply text-muted-foreground;
      }
      span {
        @apply leading-[0];
      }
    }
  }
  .leaflet-marker-icon {
    @apply opacity-20;
  }
  .dashboard--map-tooltip {
    @apply bg-[#1B1B28] text-white border-none shadow-none rounded px-3 py-1 text-sm leading-[1.43] tracking-[-0.02em] font-Poppins before:hidden after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:translate-y-full after:bg-no-repeat after:w-2 after:h-2;
    &::after {
      background-image: url("data:image/svg+xml,%3Csvg width='9' height='5' viewBox='0 0 9 5' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M8.5 3.49691e-07L0.5 0L2.8359 3.50385C3.62754 4.69132 5.37246 4.69132 6.1641 3.50385L8.5 3.49691e-07Z' fill='%231B1B28'/%3E%3C/svg%3E");
    }
  }
}
</style>
