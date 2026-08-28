import React from 'react';
import { Compass, MoveUpRight, Orbit, Disc, Triangle } from 'lucide-react';
import { HandGesture } from '../types';

interface Props {
  activeGesture: HandGesture;
  simulatedGesture: HandGesture | null;
  onSelectGesture: (gesture: HandGesture) => void;
}

interface GestureItem {
  key: HandGesture;
  name: string;
  subName: string;
  desc: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
}

export const GestureGuide: React.FC<Props> = ({
  activeGesture,
  simulatedGesture,
  onSelectGesture,
}) => {
  const gestures: GestureItem[] = [
    {
      key: 'FREE_FLIGHT',
      name: '自由漫游',
      subName: '无手势 / 默认',
      desc: 'Boids 鸟群自然灵动飞行',
      icon: <Compass size={18} className="text-teal-400" />,
      color: 'from-teal-950/40 to-slate-900/60',
      borderColor: 'border-teal-500/50',
    },
    {
      key: 'TWO_FINGER_POINT',
      name: '双指·御剑诀',
      subName: '食指中指并拢',
      desc: '指引剑群朝指尖方向疾飞',
      icon: <MoveUpRight size={18} className="text-sky-400" />,
      color: 'from-sky-950/40 to-slate-900/60',
      borderColor: 'border-sky-500/50',
    },
    {
      key: 'OPEN_PALM_RING',
      name: '张开·混元环',
      subName: '张开五指掌心',
      desc: '剑群化作双重圆环旋转护体',
      icon: <Orbit size={18} className="text-emerald-400" />,
      color: 'from-emerald-950/40 to-slate-900/60',
      borderColor: 'border-emerald-500/50',
    },
    {
      key: 'FIST_CLUSTER',
      name: '握拳·凝剑核',
      subName: '五指握紧成拳',
      desc: '万剑归宗 紧密聚拢成团',
      icon: <Disc size={18} className="text-amber-400" />,
      color: 'from-amber-950/40 to-slate-900/60',
      borderColor: 'border-amber-500/50',
    },
    {
      key: 'FOUR_FINGER_TRIANGLE',
      name: '四指·诛仙阵',
      subName: '四指并拢伸直',
      desc: '三才聚顶 凝成三角形剑阵',
      icon: <Triangle size={18} className="text-purple-400" />,
      color: 'from-purple-950/40 to-slate-900/60',
      borderColor: 'border-purple-500/50',
    },
  ];

  return (
    <div
      id="gesture-guide-bar"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2.5 p-2 bg-slate-950/80 backdrop-blur-2xl border border-slate-700/60 rounded-2xl shadow-2xl shadow-black/80 max-w-[95vw] overflow-x-auto scrollbar-none"
    >
      {gestures.map((item) => {
        const isActive = activeGesture === item.key;
        const isSimulated = simulatedGesture === item.key;

        return (
          <button
            key={item.key}
            id={`gesture-btn-${item.key}`}
            onClick={() => onSelectGesture(item.key)}
            className={`group relative flex flex-col items-center justify-center px-3.5 py-2 rounded-xl transition-all duration-300 min-w-[110px] text-center border ${
              isActive
                ? `bg-gradient-to-b ${item.color} ${item.borderColor} shadow-lg shadow-sky-950/50 scale-[1.03]`
                : 'bg-slate-900/40 border-slate-800/80 hover:bg-slate-800/60 hover:border-slate-700'
            }`}
          >
            {/* Active Indicator Top Dot */}
            {isActive && (
              <span className="absolute -top-1.5 w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8] animate-pulse" />
            )}

            {/* Icon + Title */}
            <div className="flex items-center gap-1.5 mb-1">
              <div className="p-1 rounded-lg bg-slate-950/60 border border-slate-800">
                {item.icon}
              </div>
              <span
                className={`text-xs font-bold font-serif tracking-wide ${
                  isActive ? 'text-white' : 'text-slate-300 group-hover:text-slate-100'
                }`}
              >
                {item.name}
              </span>
            </div>

            {/* Subtitle / Gesture Rule */}
            <span className="text-[10px] text-slate-400 font-medium tracking-tight">
              {item.subName}
            </span>

            {/* Description tooltip on hover */}
            <span className="text-[9px] text-slate-500 mt-0.5 max-w-[105px] truncate">
              {item.desc}
            </span>

            {/* Simulated Badge */}
            {isSimulated && (
              <span className="mt-1 text-[8px] uppercase tracking-wider text-amber-300 bg-amber-950/80 px-1 py-0.2 rounded border border-amber-700/60">
                已锁定
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
