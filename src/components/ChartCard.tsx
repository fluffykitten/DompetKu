import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { 
  BarChart, 
  PieChart, 
  LineChart 
} from 'react-native-chart-kit';

import { useTheme } from '../theme/ThemeContext';
import { Typography } from '../theme/typography';

const { width } = Dimensions.get('window');

type ChartType = 'bar' | 'pie' | 'line';

interface ChartCardProps {
  title: string;
  type: ChartType;
  data: any;
  chartConfig?: any;
  height?: number;
  formatYLabel?: (yValue: string) => string;
}

export default function ChartCard({ 
  title, 
  type, 
  data, 
  chartConfig,
  height = 220,
  formatYLabel
}: ChartCardProps) {
  const { colors, mode } = useTheme();

  const defaultConfig = {
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    color: (opacity = 1) => colors.primary, // base color
    labelColor: (opacity = 1) => colors.textSecondary,
    strokeWidth: 2,
    barPercentage: 0.6,
    useShadowColorFromDataset: false,
    formatYLabel,
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: colors.primary
    },
    ...chartConfig
  };

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart
            data={data}
            width={width - 52} // padding
            height={height}
            yAxisLabel=""
            yAxisSuffix=""
            chartConfig={defaultConfig}
            style={styles.chart}
            showValuesOnTopOfBars={true}
            fromZero
          />
        );
      case 'pie':
        return (
          <View style={{ width: '100%' }}>
            <View style={{ alignItems: 'center' }}>
              <PieChart
                data={data}
                width={width - 52}
                height={height}
                chartConfig={defaultConfig}
                accessor={"population"}
                backgroundColor={"transparent"}
                paddingLeft={((width - 52) / 4 - 15).toString()}
                center={[0, 0]}
                hasLegend={false}
              />
            </View>
            <View style={{ marginTop: 8, paddingHorizontal: 8 }}>
              {data.map((item: any, index: number) => (
                <View key={index} style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: item.color, marginRight: 8 }} />
                    <Text style={{ color: item.legendFontColor || defaultConfig.labelColor(), fontSize: item.legendFontSize || 12 }}>{item.name}</Text>
                  </View>
                  <Text style={{ color: item.legendFontColor || defaultConfig.labelColor(), fontWeight: '600', fontSize: item.legendFontSize || 12 }}>
                    {defaultConfig.formatYLabel ? defaultConfig.formatYLabel(item.population.toString()) : item.population}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        );
      case 'line':
        return (
          <LineChart
            data={data}
            width={width - 52}
            height={height}
            chartConfig={defaultConfig}
            bezier
            style={styles.chart}
            formatYLabel={formatYLabel}
          />
        );
      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      <Text style={[styles.title, Typography.h4, { color: colors.text }]}>
        {title}
      </Text>
      
      {data ? (
        <View style={styles.chartContainer}>
          {renderChart()}
        </View>
      ) : (
        <View style={[styles.emptyContainer, { height }]}>
          <Text style={{ color: colors.textLight }}>Belum ada data cukup</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  title: {
    marginBottom: 16,
  },
  chartContainer: {
    alignItems: 'center',
    marginLeft: -10, // Adjust centering
  },
  chart: {
    borderRadius: 12,
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
