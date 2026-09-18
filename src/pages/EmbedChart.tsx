import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart, PieChart, LineChart, StackedChart } from '@/components/charts';

export default function EmbedChart() {
  const [searchParams] = useSearchParams();
  const [config, setConfig] = useState<any>(null);
  
  // Local state for interactive elements
  const [pieFactIndex, setPieFactIndex] = useState(0);
  const [radialFactIndex, setRadialFactIndex] = useState(0);

  useEffect(() => {
    const configStr = searchParams.get('config');
    if (configStr) {
      try {
        const parsed = JSON.parse(decodeURIComponent(configStr));
        setConfig(parsed);
        if (parsed.options?.factIndex !== undefined) {
          setPieFactIndex(parsed.options.factIndex);
          setRadialFactIndex(parsed.options.factIndex);
        }
      } catch (e) {
        console.error("Failed to parse embed config", e);
      }
    }
  }, [searchParams]);

  if (!config) {
    return <div className="flex items-center justify-center w-full h-screen">Loading or invalid config...</div>;
  }

  const { type, data, total, options = {} } = config;

  const renderChart = () => {
    switch (type) {
      case 'bar':
        return (
          <BarChart 
            data={data} 
            isHorizontal={options.isHorizontal}
            showLabels={options.showLabels}
          />
        );
      case 'pie':
        return (
          <PieChart 
            data={data} 
            total={total} 
            showFactText={options.showFactText} 
            factIndex={pieFactIndex}
            onFactIndexChange={setPieFactIndex}
          />
        );
      case 'stacked':
        return (
          <StackedChart 
            data={data} 
            isHorizontal={options.isHorizontal} 
            showLabels={options.showLabels} 
            showRadial={options.showRadial} 
            showFactText={options.showFactText} 
            factIndex={radialFactIndex}
            onFactIndexChange={setRadialFactIndex}
          />
        );
      case 'line':
        return (
          <LineChart 
            data={data} 
            showLabels={options.showLabels}
            showGradientArea={options.showGradientArea}
            lineColor={options.lineColor}
          />
        );
      default:
        return <div>Invalid chart type</div>;
    }
  };

  return (
    <div className={`w-full h-screen flex flex-col p-2 bg-background ${!options.showLegend ? "fast-chart-legend-hidden" : ""} ${options.showLabels ? 'fast-chart-labels-visible' : 'fast-chart-labels-hidden'}`}>
      {renderChart()}
    </div>
  );
}
