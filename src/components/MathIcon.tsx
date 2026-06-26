/**
 * KeKe ExamHub - 考试信息管理系统
 * @author 落梦陳 (KeKe0904) | B站/抖音: 落梦陳
 * @github https://github.com/KeKe0904/KeKe-ExamHub
 * @license MIT
 */
import { useMemo } from "react";

/**
 * MathIcon - 用数学函数生成的 SVG 图标库
 * 所有图形通过三角函数、参数方程等数学函数计算 SVG 路径
 */

interface IconProps {
  className?: string;
  size?: number;
}

const defaultSize = 24;

// === 数学辅助函数 ===

// 生成圆弧路径（极坐标参数方程）
function arcPath(
  cx: number, cy: number, r: number,
  startAngle: number, endAngle: number,
  sweep = 1
): string {
  const sx = cx + r * Math.cos(startAngle);
  const sy = cy + r * Math.sin(startAngle);
  const ex = cx + r * Math.cos(endAngle);
  const ey = cy + r * Math.sin(endAngle);
  const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
  return `M ${sx} ${sy} A ${r} ${r} 0 ${largeArc} ${sweep} ${ex} ${ey}`;
}

// 生成完整圆路径
function circlePath(cx: number, cy: number, r: number): string {
  return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
}

// 生成椭圆路径
function ellipsePath(cx: number, cy: number, rx: number, ry: number): string {
  return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
}

// 生成正多边形顶点（用三角函数）
function polygonPoints(cx: number, cy: number, r: number, n: number, rotation = 0): string {
  const points: string[] = [];
  for (let i = 0; i < n; i++) {
    const angle = rotation + (i * 2 * Math.PI) / n;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(" ");
}

// 生成星形顶点
function starPoints(cx: number, cy: number, rOuter: number, rInner: number, n: number, rotation = 0): string {
  const points: string[] = [];
  for (let i = 0; i < n * 2; i++) {
    const angle = rotation + (i * Math.PI) / n;
    const r = i % 2 === 0 ? rOuter : rInner;
    points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  return points.join(" ");
}

// 生成正弦波路径
function sineWavePath(x1: number, x2: number, y: number, amplitude: number, frequency: number): string {
  const steps = 50;
  const dx = (x2 - x1) / steps;
  let path = `M ${x1} ${y}`;
  for (let i = 1; i <= steps; i++) {
    const x = x1 + i * dx;
    const y_offset = amplitude * Math.sin(frequency * (x - x1));
    path += ` L ${x} ${y + y_offset}`;
  }
  return path;
}

// === 图标组件 ===

// 太阳（日出）- 用圆和射线（三角函数计算位置）
export function Sunrise({ className, size = defaultSize }: IconProps) {
  const cx = 12, cy = 14, r = 4;
  const rays = 8;
  const rayPaths = useMemo(() => {
    const paths: string[] = [];
    for (let i = 0; i < rays; i++) {
      const angle = (i * 2 * Math.PI) / rays;
      const x1 = cx + (r + 1) * Math.cos(angle);
      const y1 = cy + (r + 1) * Math.sin(angle);
      const x2 = cx + (r + 3) * Math.cos(angle);
      const y2 = cy + (r + 3) * Math.sin(angle);
      // 只画上半部分的射线
      if (y2 < cy + 2) {
        paths.push(`M ${x1} ${y1} L ${x2} ${y2}`);
      }
    }
    return paths.join(" ");
  }, []);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={arcPath(cx, cy, r, Math.PI, 2 * Math.PI)} fill="none" />
      {rayPaths && <path d={rayPaths} />}
      <path d="M 4 20 L 20 20" />
      <path d="M 12 4 L 12 7" />
    </svg>
  );
}

// 太阳 - 用圆和射线
export function Sun({ className, size = defaultSize }: IconProps) {
  const cx = 12, cy = 12, r = 4;
  const rays = 12;
  const rayPaths = useMemo(() => {
    const paths: string[] = [];
    for (let i = 0; i < rays; i++) {
      const angle = (i * 2 * Math.PI) / rays;
      const x1 = cx + (r + 1) * Math.cos(angle);
      const y1 = cy + (r + 1) * Math.sin(angle);
      const x2 = cx + (r + 3) * Math.cos(angle);
      const y2 = cy + (r + 3) * Math.sin(angle);
      paths.push(`M ${x1} ${y1} L ${x2} ${y2}`);
    }
    return paths.join(" ");
  }, []);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx={cx} cy={cy} r={r} />
      <path d={rayPaths} />
    </svg>
  );
}

// 月亮 - 用两个圆的差集（月相）
export function Moon({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 20 12 A 8 8 0 1 1 12 4 A 6 6 0 1 0 20 12 Z" />
    </svg>
  );
}

// 日历 - 用矩形和网格线
export function Calendar({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M 3 9 L 21 9" />
      <path d="M 8 3 L 8 7" />
      <path d="M 16 3 L 16 7" />
    </svg>
  );
}

// 时钟 - 用圆和指针（指针角度用三角函数计算）
export function Clock({ className, size = defaultSize }: IconProps) {
  const cx = 12, cy = 12, r = 9;
  // 时针指向 10 点方向，分针指向 2 点方向
  const hourAngle = (-60 * Math.PI) / 180;
  const minuteAngle = (60 * Math.PI) / 180;
  const hourX = cx + 4 * Math.cos(hourAngle - Math.PI / 2);
  const hourY = cy + 4 * Math.sin(hourAngle - Math.PI / 2);
  const minX = cx + 6 * Math.cos(minuteAngle - Math.PI / 2);
  const minY = cy + 6 * Math.sin(minuteAngle - Math.PI / 2);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx={cx} cy={cy} r={r} />
      <path d={`M ${cx} ${cy} L ${hourX} ${hourY}`} />
      <path d={`M ${cx} ${cy} L ${minX} ${minY}`} />
    </svg>
  );
}

// 用户 - 用圆（头）和椭圆弧（身体）
export function User({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="8" r="4" />
      <path d="M 4 21 A 8 8 0 0 1 20 21" />
    </svg>
  );
}

// 地图标记 - 用参数方程绘制水滴形
export function MapPin({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 12 22 C 12 22 5 14 5 9 A 7 7 0 0 1 19 9 C 19 14 12 22 12 22 Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}

// 搜索 - 用圆和线（切线）
export function Search({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="10" cy="10" r="6" />
      <path d="M 15 15 L 21 21" />
    </svg>
  );
}

// 箭头（右）- 用线
export function ArrowRight({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 4 12 L 20 12" />
      <path d="M 14 6 L 20 12 L 14 18" />
    </svg>
  );
}

// 箭头（左）
export function ArrowLeft({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 20 12 L 4 12" />
      <path d="M 10 6 L 4 12 L 10 18" />
    </svg>
  );
}

// 沙漏 - 用三角形（上下对称）
export function Hourglass({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 6 3 L 18 3" />
      <path d="M 6 21 L 18 21" />
      <path d="M 6 3 L 18 21" />
      <path d="M 18 3 L 6 21" />
    </svg>
  );
}

// 闪光/星星 - 用正弦波变形生成四角星
export function Sparkles({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 12 3 L 13.5 9 L 19 10.5 L 13.5 12 L 12 18 L 10.5 12 L 5 10.5 L 10.5 9 Z" />
      <path d="M 18 4 L 18 7" />
      <path d="M 16.5 5.5 L 19.5 5.5" />
    </svg>
  );
}

// 毕业帽 - 用平行四边形和菱形
export function GraduationCap({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 2 9 L 12 5 L 22 9 L 12 13 Z" />
      <path d="M 6 11 L 6 16 C 6 17 9 19 12 19 C 15 19 18 17 18 16 L 18 11" />
      <path d="M 22 9 L 22 14" />
    </svg>
  );
}

// 菜单 - 三条线
export function Menu({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 3 6 L 21 6" />
      <path d="M 3 12 L 21 12" />
      <path d="M 3 18 L 21 18" />
    </svg>
  );
}

// 关闭 X - 两条交叉线
export function X({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 6 6 L 18 18" />
      <path d="M 18 6 L 6 18" />
    </svg>
  );
}

// 检查 - 用线段
export function Check({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 4 12 L 10 18 L 20 6" />
    </svg>
  );
}

// 检查圆圈
export function CheckCircle2({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M 8 12 L 11 15 L 16 9" />
    </svg>
  );
}

// CPU - 用矩形芯片和引脚
export function Cpu({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="6" y="6" width="12" height="12" rx="1" />
      <rect x="9" y="9" width="6" height="6" rx="0.5" />
      <path d="M 9 2 L 9 6 M 12 2 L 12 6 M 15 2 L 15 6" />
      <path d="M 9 18 L 9 22 M 12 18 L 12 22 M 15 18 L 15 22" />
      <path d="M 2 9 L 6 9 M 2 12 L 6 12 M 2 15 L 6 15" />
      <path d="M 18 9 L 22 9 M 18 12 L 22 12 M 18 15 L 22 15" />
    </svg>
  );
}

// 硬盘 - 用矩形和圆盘
export function HardDrive({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="8" width="18" height="10" rx="1" />
      <circle cx="8" cy="13" r="2" />
      <path d="M 14 12 L 18 12 M 14 14 L 18 14" />
    </svg>
  );
}

// 网络 - 用节点和连线（三角形拓扑）
export function Network({ className, size = defaultSize }: IconProps) {
  const nodes = [
    { x: 12, y: 4 },
    { x: 5, y: 18 },
    { x: 19, y: 18 },
    { x: 12, y: 12 },
  ];
  const edges = [
    [0, 3], [3, 1], [3, 2], [0, 1], [0, 2], [1, 2],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      {edges.map(([a, b], i) => (
        <line key={i} x1={nodes[a].x} y1={nodes[a].y} x2={nodes[b].x} y2={nodes[b].y} />
      ))}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r="1.5" fill="currentColor" />
      ))}
    </svg>
  );
}

// 活动监控 - 用心跳波形线
export function Activity({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 2 12 L 6 12 L 8 7 L 12 17 L 14 12 L 18 12 L 22 12" />
    </svg>
  );
}

// 温度计 - 用于CPU温度
export function Thermometer({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M14 4a2 2 0 0 0-4 0v10.5a4 4 0 1 0 4 0V4z" />
      <circle cx="12" cy="17" r="1.5" fill="currentColor" />
    </svg>
  );
}

// 服务器 - 用矩形堆叠
export function Server({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="6" rx="1" />
      <rect x="3" y="14" width="18" height="6" rx="1" />
      <circle cx="7" cy="7" r="0.5" fill="currentColor" />
      <circle cx="7" cy="17" r="0.5" fill="currentColor" />
    </svg>
  );
}

// 数据库 - 用椭圆和圆柱
export function Database({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <ellipse cx="12" cy="5" rx="8" ry="2.5" />
      <path d="M 4 5 L 4 12 A 8 2.5 0 0 0 20 12 L 20 5" />
      <path d="M 4 12 L 4 19 A 8 2.5 0 0 0 20 19 L 20 12" />
    </svg>
  );
}

// 全球 - 用圆和经纬线
export function Globe({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <ellipse cx="12" cy="12" rx="4" ry="9" />
      <path d="M 3 12 L 21 12" />
    </svg>
  );
}

// 终端 - 用矩形和提示符
export function Terminal({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M 7 9 L 10 12 L 7 15" />
      <path d="M 13 15 L 17 15" />
    </svg>
  );
}

// 刷新 - 用圆弧（参数方程）
export function RefreshCw({ className, size = defaultSize }: IconProps) {
  const cx = 12, cy = 12, r = 8;
  const startAngle = -Math.PI / 4;
  const endAngle = startAngle + (3 * Math.PI) / 2;
  const arc = arcPath(cx, cy, r, startAngle, endAngle);
  const arrowAngle = endAngle;
  const ax = cx + r * Math.cos(arrowAngle);
  const ay = cy + r * Math.sin(arrowAngle);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={arc} />
      <path d={`M ${ax} ${ay} L ${ax - 3} ${ay - 3} L ${ax + 1} ${ay - 4}`} />
    </svg>
  );
}

// 加号 - 两条交叉线
export function Plus({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 12 5 L 12 19" />
      <path d="M 5 12 L 19 12" />
    </svg>
  );
}

// 退出 - 用门和箭头
export function LogOut({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 10 3 L 5 3 L 5 21 L 10 21" />
      <path d="M 10 12 L 20 12" />
      <path d="M 16 8 L 20 12 L 16 16" />
    </svg>
  );
}

// 仪表盘 - 用矩形网格
export function LayoutDashboard({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="8" height="8" rx="1" />
      <rect x="13" y="3" width="8" height="5" rx="1" />
      <rect x="13" y="10" width="8" height="11" rx="1" />
      <rect x="3" y="13" width="8" height="8" rx="1" />
    </svg>
  );
}

// 文件 - 用矩形和折角
export function FileText({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 5 3 L 15 3 L 19 7 L 19 21 L 5 21 Z" />
      <path d="M 15 3 L 15 7 L 19 7" />
      <path d="M 9 13 L 15 13" />
      <path d="M 9 17 L 15 17" />
    </svg>
  );
}

// 日历取消 - 日历加 X
export function CalendarX({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M 3 9 L 21 9" />
      <path d="M 8 3 L 8 7" />
      <path d="M 16 3 L 16 7" />
      <path d="M 10 13 L 14 17" />
      <path d="M 14 13 L 10 17" />
    </svg>
  );
}

// 加载中 - 用圆弧（旋转动画）
export function Loader2({ className, size = defaultSize }: IconProps) {
  const cx = 12, cy = 12, r = 9;
  const arc = arcPath(cx, cy, r, 0, (3 * Math.PI) / 2);
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={`animate-spin ${className || ""}`}>
      <path d={arc} />
    </svg>
  );
}

// 日历检查 - 日历加勾
export function CalendarCheck({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M 3 9 L 21 9" />
      <path d="M 8 3 L 8 7" />
      <path d="M 16 3 L 16 7" />
      <path d="M 9 14 L 11 16 L 15 12" />
    </svg>
  );
}

// 趋势上升 - 用折线
export function TrendingUp({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 3 17 L 9 11 L 13 15 L 21 7" />
      <path d="M 15 7 L 21 7 L 21 13" />
    </svg>
  );
}

// 眼睛 - 用圆和椭圆
export function Eye({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 2 12 C 2 12 6 5 12 5 C 18 5 22 12 22 12 C 22 12 18 19 12 19 C 6 19 2 12 2 12 Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// 眼睛关闭 - 用椭圆和线
export function EyeOff({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 2 12 C 2 12 6 5 12 5 C 14 5 16 5.5 17.5 6.5" />
      <path d="M 22 12 C 22 12 18 19 12 19 C 10 19 8 18.5 6.5 17.5" />
      <path d="M 4 4 L 20 20" />
      <path d="M 9.5 9.5 A 3 3 0 0 0 14.5 14.5" />
    </svg>
  );
}

// 锁 - 用矩形和圆弧
export function Lock({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="5" y="11" width="14" height="10" rx="1" />
      <path d="M 8 11 L 8 7 A 4 4 0 0 1 16 7 L 16 11" />
    </svg>
  );
}

// 编辑 - 用矩形和铅笔
export function Edit({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 14 4 L 20 10 L 8 22 L 2 22 L 2 16 Z" />
      <path d="M 14 4 L 17 1 L 21 5 L 18 8" />
    </svg>
  );
}

// 删除 - 用矩形和 X
export function Trash2({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 4 7 L 20 7" />
      <path d="M 9 7 L 9 4 L 15 4 L 15 7" />
      <path d="M 6 7 L 7 21 L 17 21 L 18 7" />
      <path d="M 10 11 L 10 17" />
      <path d="M 14 11 L 14 17" />
    </svg>
  );
}

// 设置 - 用齿轮（正多边形 + 圆）
export function Settings({ className, size = defaultSize }: IconProps) {
  const cx = 12, cy = 12, rOuter = 9, rInner = 7;
  const teeth = 8;
  const gearPath = useMemo(() => {
    const points: string[] = [];
    const steps = teeth * 4;
    for (let i = 0; i <= steps; i++) {
      const angle = (i * 2 * Math.PI) / steps;
      const phase = i % 4;
      const r = phase === 0 || phase === 1 ? rOuter : rInner;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return `M ${points.join(" L ")} Z`;
  }, []);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={gearPath} />
      <circle cx={cx} cy={cy} r="3" />
    </svg>
  );
}

// 警告 - 用三角形和感叹号
export function AlertCircle({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M 12 8 L 12 13" />
      <circle cx="12" cy="16.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

// 警告三角形 - 用三角形和感叹号
export function AlertTriangle({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 12 3 L 22 20 L 2 20 Z" />
      <path d="M 12 9 L 12 14" />
      <circle cx="12" cy="17.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

// 信息 - 用圆和 i
export function Info({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="12" cy="12" r="9" />
      <path d="M 12 11 L 12 17" />
      <circle cx="12" cy="7.5" r="0.5" fill="currentColor" />
    </svg>
  );
}

// 保存 - 用软盘图形
export function Save({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 5 3 L 19 3 L 21 5 L 21 21 L 3 21 L 3 5 Z" />
      <path d="M 7 3 L 7 9 L 15 9 L 15 3" />
      <rect x="8" y="14" width="8" height="6" rx="0.5" />
    </svg>
  );
}

// 打印机 - 用矩形和圆
export function Printer({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 6 9 L 6 3 L 18 3 L 18 9" />
      <rect x="4" y="9" width="16" height="8" rx="1" />
      <path d="M 6 17 L 6 21 L 18 21 L 18 17" />
      <circle cx="17" cy="13" r="0.5" fill="currentColor" />
    </svg>
  );
}

// 向下箭头 - 用折线
export function ChevronDown({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 6 9 L 12 15 L 18 9" />
    </svg>
  );
}

// 向上箭头 - 用折线
export function ChevronUp({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 6 15 L 12 9 L 18 15" />
    </svg>
  );
}

// 检查圆圈（别名，与 CheckCircle2 相同）
export const CheckCircle = CheckCircle2;

// 全屏图标 - 用四角折线表示
export function Maximize({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 4 9 L 4 4 L 9 4" />
      <path d="M 15 4 L 20 4 L 20 9" />
      <path d="M 20 15 L 20 20 L 15 20" />
      <path d="M 9 20 L 4 20 L 4 15" />
    </svg>
  );
}

// 退出全屏图标 - 用四角向内的折线表示
export function Minimize({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 9 4 L 9 9 L 4 9" />
      <path d="M 20 9 L 15 9 L 15 4" />
      <path d="M 15 20 L 15 15 L 20 15" />
      <path d="M 4 15 L 9 15 L 9 20" />
    </svg>
  );
}

// 图片图标 - 用矩形和圆形组合表示
export function Image({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M 21 15 L 16 10 L 5 21" />
    </svg>
  );
}

// 教学楼图标 - 用矩形和拱形窗口表示
export function Building({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <line x1="9" y1="6" x2="9" y2="10" />
      <line x1="15" y1="6" x2="15" y2="10" />
      <line x1="9" y1="14" x2="9" y2="18" />
      <line x1="15" y1="14" x2="15" y2="18" />
      <line x1="12" y1="6" x2="12" y2="10" />
      <line x1="12" y1="14" x2="12" y2="18" />
    </svg>
  );
}

// 电话图标 - 用波浪线表示
export function Phone({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 22 16.92 v 3 a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2 h3 a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6 l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 A2 2 0 0 1 22 16.92 z" />
    </svg>
  );
}

// 包/依赖图标 - 立体盒子
export function Package({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 21 16 V 8 a2 2 0 0 0-1-1.73 l-7-4 a2 2 0 0 0-2 0 l-7 4 A2 2 0 0 0 3 8 v8 a2 2 0 0 0 1 1.73 l7 4 a2 2 0 0 0 2 0 l7-4 A2 2 0 0 0 21 16 z" />
      <path d="M 3.27 6.96 12 12.01 l8.73-5.05" />
      <path d="M 12 22.08 V 12" />
    </svg>
  );
}

// Git 分支图标
export function GitBranch({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M 18 9 a9 9 0 0 1-9 9" />
    </svg>
  );
}

// 下载图标
export function Download({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 21 15 v 4 a2 2 0 0 1-2 2 H 5 a2 2 0 0 1-2-2 v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

// 重置/重装图标 - 逆时针箭头
export function RotateCcw({ className, size = defaultSize }: IconProps) {
  const cx = 12, cy = 12, r = 8;
  const startAngle = -Math.PI / 4;
  const endAngle = startAngle - (3 * Math.PI) / 2;
  const arc = arcPath(cx, cy, r, startAngle, endAngle);
  const arrowAngle = endAngle;
  const ax = cx + r * Math.cos(arrowAngle);
  const ay = cy + r * Math.sin(arrowAngle);

  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d={arc} />
      <polyline points={`${ax - 2},${ay - 2} ${ax},${ay} ${ax + 2},${ay - 2}`} />
    </svg>
  );
}

// 代码图标
export function Code({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

// 盾牌图标 - 安全保护
export function Shield({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M 12 22 s 8-4 8-10 V 5 l-8-3-8 3 v7 c 0 6 8 10 8 10 z" />
    </svg>
  );
}

// 盒子图标 - 组件
export function Box({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

// 复制图标
export function Copy({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M 5 15 H 4 a2 2 0 0 1-2-2 V 4 a2 2 0 0 1 2-2 h9 a2 2 0 0 1 2 2 v1" />
    </svg>
  );
}

// 显示器图标 - 用于教室端
export function Monitor({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

// 右箭头 - 简化版
export function ChevronRight({ className, size = defaultSize }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

// 导出图标对象，方便批量使用
export const MathIcons = {
  Sunrise, Sun, Moon, Calendar, Clock, User, MapPin, Search,
  ArrowRight, ArrowLeft, Hourglass, Sparkles, GraduationCap,
  Menu, X, Check, CheckCircle2, CheckCircle, Server, Database, Globe,
  Terminal, RefreshCw, Plus, LogOut, LayoutDashboard, FileText,
  CalendarX, Loader2, CalendarCheck, TrendingUp, Eye, EyeOff,
  Lock, Edit, Trash2, Settings, AlertCircle, AlertTriangle,
  Info, Save, Printer, ChevronDown, ChevronUp, Maximize, Minimize,
  Image, Building, Phone,
  Package, GitBranch, Download, RotateCcw, Code, Shield, Box, Copy,
  Cpu, HardDrive, Network, Activity, Thermometer,
  Monitor, ChevronRight,
};

export default MathIcons;
