import { 
  LineChart, 
  Line, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar,
  PieChart, 
  Pie, 
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

interface ChartDataPoint {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface MiniChartProps {
  data: ChartDataPoint[];
  type?: 'line' | 'area' | 'bar' | 'pie' | 'donut' | 'multi-bar' | 'multi-line';
  dataKey?: string;
  dataKeys?: { key: string; color: string; name?: string }[];
  height?: number;
  showAxis?: boolean;
  showGrid?: boolean;
  showTooltip?: boolean;
  showLegend?: boolean;
  colors?: string[];
  className?: string;
}

// Chart colors - uses CSS variable for brand color which adapts to context
const CHART_COLORS = [
  'hsl(var(--brand))',       // Primary brand color (dynamic)
  'hsl(142, 76%, 36%)',      // Green
  'hsl(262, 83%, 58%)',      // Purple
  'hsl(199, 89%, 48%)',      // Blue
  'hsl(0, 0%, 60%)',         // Gray
  'hsl(45, 93%, 47%)',       // Amber/Gold
  'hsl(0, 72%, 51%)',        // Red
];

export const MiniChart = ({
  data,
  type = 'area',
  dataKey = 'value',
  dataKeys,
  height = 120,
  showAxis = false,
  showGrid = false,
  showTooltip = true,
  showLegend = false,
  colors = CHART_COLORS,
  className,
}: MiniChartProps) => {
  const primaryColor = colors[0];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-card border border-border rounded-lg px-3 py-2 shadow-lg">
          <p className="text-foreground font-medium text-sm">
            {payload[0].payload.name}
          </p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-xs" style={{ color: entry.color }}>
              {entry.name || entry.dataKey}: {typeof entry.value === 'number' 
                ? entry.value.toLocaleString() 
                : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return (
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />}
            {showAxis && <XAxis dataKey="name" stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showAxis && <YAxis stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            <Line 
              type="monotone" 
              dataKey={dataKey} 
              stroke={primaryColor} 
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        );

      case 'multi-line':
        return (
          <LineChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />}
            {showAxis && <XAxis dataKey="name" stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showAxis && <YAxis stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {dataKeys?.map((dk, index) => (
              <Line 
                key={dk.key}
                type="monotone" 
                dataKey={dk.key} 
                stroke={dk.color || colors[index % colors.length]} 
                strokeWidth={2}
                dot={false}
                name={dk.name || dk.key}
              />
            ))}
          </LineChart>
        );
      
      case 'area':
        return (
          <AreaChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />}
            {showAxis && <XAxis dataKey="name" stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showAxis && <YAxis stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={primaryColor} stopOpacity={0.3} />
                <stop offset="95%" stopColor={primaryColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area 
              type="monotone" 
              dataKey={dataKey} 
              stroke={primaryColor} 
              strokeWidth={2}
              fill="url(#colorValue)"
            />
          </AreaChart>
        );
      
      case 'bar':
        return (
          <BarChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />}
            {showAxis && <XAxis dataKey="name" stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showAxis && <YAxis stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            <Bar 
              dataKey={dataKey} 
              fill={primaryColor}
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );

      case 'multi-bar':
        return (
          <BarChart data={data}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="hsl(0 0% 16%)" />}
            {showAxis && <XAxis dataKey="name" stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showAxis && <YAxis stroke="hsl(0 0% 55%)" fontSize={10} />}
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            {showLegend && <Legend />}
            {dataKeys?.map((dk, index) => (
              <Bar 
                key={dk.key}
                dataKey={dk.key} 
                fill={dk.color || colors[index % colors.length]}
                radius={[4, 4, 0, 0]}
                name={dk.name || dk.key}
              />
            ))}
          </BarChart>
        );
      
      case 'pie':
        return (
          <PieChart>
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={height * 0.4}
              paddingAngle={2}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        );

      case 'donut':
        return (
          <PieChart>
            {showTooltip && <Tooltip content={<CustomTooltip />} />}
            <Pie
              data={data}
              dataKey={dataKey}
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={height * 0.25}
              outerRadius={height * 0.4}
              paddingAngle={2}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Pie>
          </PieChart>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className={cn(className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

export default MiniChart;
