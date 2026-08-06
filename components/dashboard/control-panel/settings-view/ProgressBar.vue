<template>
  <div>
    <div class="relative grid grid-cols-2 gap-1 z-0">
      <div class="relative h-2 bg-[#F2F2F2] rounded-lg" />
      <div class="grid grid-cols-3 gap-1">
        <div class="relative h-2 bg-[#F2F2F2] rounded-lg" />
        <div class="relative h-2 bg-[#F2F2F2] rounded-lg" />
        <div class="relative h-2 bg-[#F2F2F2] rounded-lg" />
      </div>
    </div>
    <div class="relative h-8 grid grid-cols-2 gap-1 -translate-y-6">
      <div ref="chart1" />
      <div class="grid grid-cols-3 gap-1">
        <div ref="chart2" />
        <div ref="chart3" />
        <div ref="chart4" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
const chartDesigns = {
  progressBarOne: {
    chart: {
      type: 'bar',
      zoom: { enabled: false },
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: {
        enabled: true,
        easing: 'easein',
        speed: 800,
        animateGradually: { enabled: false, delay: 150 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
      height: '40px',
    },
    states: { hover: { filter: { type: 'none' } } },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: 8,
        borderRadius: 4,
        colors: {
          backgroundBarColors: ['#EBEBEB'],
          backgroundBarOpacity: 1,
          backgroundBarRadius: 4,
        },
      },
      dataLabels: { show: false },
    },
    fill: { colors: ['#00D395'] },
    grid: { show: false },
    xaxis: {
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false },
      max: 1,
      min: 0,
    },
    yaxis: { labels: { show: false } },
    tooltip: { enabled: false },
  },
  progressBarTwo: {
    chart: {
      type: 'bar',
      zoom: { enabled: false },
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: {
        enabled: true,
        easing: 'linear',
        speed: 800,
        animateGradually: { enabled: false, delay: 150 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
      height: '40px',
    },
    states: { hover: { filter: { type: 'none' } } },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: 8,
        borderRadius: 4,
        colors: {
          backgroundBarColors: ['#EBEBEB'],
          backgroundBarOpacity: 1,
          backgroundBarRadius: 4,
        },
      },
      dataLabels: { show: false },
    },
    fill: { colors: ['#FFB100'] },
    grid: { show: false },
    xaxis: {
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false },
      max: 1,
      min: 0,
    },
    yaxis: { labels: { show: false } },
    tooltip: { enabled: false },
  },
  progressBarThree: {
    chart: {
      type: 'bar',
      zoom: { enabled: false },
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: {
        enabled: true,
        easing: 'linear',
        speed: 800,
        animateGradually: { enabled: false, delay: 150 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
      height: '40px',
    },
    states: { hover: { filter: { type: 'none' } } },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: 8,
        borderRadius: 4,
        colors: {
          backgroundBarColors: ['#EBEBEB'],
          backgroundBarOpacity: 1,
          backgroundBarRadius: 4,
        },
      },
      dataLabels: { show: false },
    },
    fill: { colors: ['#FF8A00'] },
    grid: { show: false },
    xaxis: {
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false },
      max: 1,
      min: 0,
    },
    yaxis: { labels: { show: false } },
    tooltip: { enabled: false },
  },
  progressBarFour: {
    chart: {
      type: 'bar',
      zoom: { enabled: false },
      toolbar: { show: false },
      sparkline: { enabled: true },
      animations: {
        enabled: true,
        easing: 'easeout',
        speed: 800,
        animateGradually: { enabled: false, delay: 150 },
        dynamicAnimation: { enabled: true, speed: 350 },
      },
      height: '40px',
    },
    states: { hover: { filter: { type: 'none' } } },
    plotOptions: {
      bar: {
        horizontal: true,
        barHeight: 8,
        borderRadius: 4,
        colors: {
          backgroundBarColors: ['#EBEBEB'],
          backgroundBarOpacity: 1,
          backgroundBarRadius: 4,
        },
      },
      dataLabels: { show: false },
    },
    fill: { colors: ['#FA4B4B'] },
    grid: { show: false },
    xaxis: {
      labels: { show: false },
      axisTicks: { show: false },
      axisBorder: { show: false },
      max: 1,
      min: 0,
    },
    yaxis: { labels: { show: false } },
    tooltip: { enabled: false },
  },
};

export default defineComponent({
  name: 'ProgressBar',
  // eslint-disable-next-line vue/require-prop-types
  props: ['value'],
  data() {
    return {
      chartSeriesOne: [
        {
          data: [
            {
              x: '',
              y: 1,
            },
          ],
        },
      ],
      chartSeriesTwo: [
        {
          data: [
            {
              x: '',
              y: 1,
            },
          ],
        },
      ],
      chartSeriesThree: [
        {
          data: [
            {
              x: '',
              y: 1,
            },
          ],
        },
      ],
      chartSeriesFour: [
        {
          data: [
            {
              x: '',
              y: 0.5,
            },
          ],
        },
      ],
    };
  },
  computed: {
    chartOptions() {
      return chartDesigns;
    },
  },
  mounted() {
    this.setChartData();
    this.renderChart('chart1', this.chartOptions.progressBarOne, this.chartSeriesOne, 0);
    this.renderChart('chart2', this.chartOptions.progressBarTwo, this.chartSeriesTwo, 800);
    this.renderChart('chart3', this.chartOptions.progressBarThree, this.chartSeriesThree, 1600);
    this.renderChart('chart4', this.chartOptions.progressBarFour, this.chartSeriesFour, 2400);
  },
  methods: {
    renderChart(refName: string, options: object, series: object, delay: number) {
      options = Object.assign(options, {
        series: series,
      });
      setTimeout(async () => {
        const { default: ApexCharts } = await import('apexcharts');
        const chart = new ApexCharts(this.$refs[refName], options);
        chart.render();
      }, delay);
    },
    setChartData() {
      const { limit, spent } = this.value;
      let barValues = [0, 0, 0, 0];
      const progress = spent / limit;
      if (progress < 0.5) {
        barValues = [progress * 2, 0, 0, 0];
      } else if (progress >= 0.5 && progress <= 1 / 2 + 1 / 6) {
        barValues = [1, (progress - 0.5) * 6, 0, 0];
      } else if (progress > 1 / 2 + 1 / 6 && progress <= 1 / 2 + 1 / 6 + 1 / 6) {
        barValues = [1, 1, (progress - (1 / 2 + 1 / 6)) * 6, 0];
      } else if (progress > 1 / 2 + 1 / 6 + 1 / 6 && progress <= 1) {
        barValues = [1, 1, 1, (progress - (1 / 2 + 1 / 6 + 1 / 6)) * 6];
      } else if (progress > 1) {
        barValues = [1, 1, 1, 1];
      }
      this.chartSeriesOne = [
        {
          data: [
            {
              x: '',
              y: barValues[0],
            },
          ],
        },
      ];
      this.chartSeriesTwo = [
        {
          data: [
            {
              x: '',
              y: barValues[1],
            },
          ],
        },
      ];
      this.chartSeriesThree = [
        {
          data: [
            {
              x: '',
              y: barValues[2],
            },
          ],
        },
      ];
      this.chartSeriesFour = [
        {
          data: [
            {
              x: '',
              y: barValues[3],
            },
          ],
        },
      ];
    },
  },
});
</script>
