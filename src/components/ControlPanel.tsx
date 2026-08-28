import React, { useState } from 'react';
import {
  Sliders,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Download,
  Palette,
  Sparkles,
  Zap,
  Info,
  X,
  Code,
  Check,
  Copy,
} from 'lucide-react';
import { SimulationConfig } from '../types';
import { SWORD_THEMES } from '../utils/canvasRenderer';
import { generateStandaloneHTML } from '../utils/standaloneExport';

interface Props {
  config: SimulationConfig;
  onChangeConfig: (newConfig: Partial<SimulationConfig>) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const ControlPanel: React.FC<Props> = ({
  config,
  onChangeConfig,
  isFullscreen,
  onToggleFullscreen,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [copied, setCopied] = useState(false);

  const currentTheme = SWORD_THEMES.find((t) => t.id === config.themeId) || SWORD_THEMES[0];

  const handleDownloadHTML = () => {
    const html = generateStandaloneHTML();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'xianjian_swords_single_file.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = () => {
    const html = generateStandaloneHTML();
    navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      {/* Floating Control Trigger Buttons on Left Bottom */}
      <div className="fixed bottom-5 left-6 z-30 flex items-center gap-2">
        <button
          id="btn-open-controls"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-900/85 hover:bg-slate-800/90 text-sky-200 border border-slate-700/80 rounded-xl backdrop-blur-xl shadow-xl transition-all hover:border-sky-500/50 hover:shadow-sky-950/40"
        >
          <Sliders size={16} className="text-sky-400" />
          <span className="text-xs font-semibold">剑道玄机</span>
        </button>

        <button
          id="btn-toggle-sound"
          onClick={() => onChangeConfig({ soundEnabled: !config.soundEnabled })}
          className="p-2.5 bg-slate-900/85 hover:bg-slate-800/90 text-slate-300 hover:text-sky-300 border border-slate-700/80 rounded-xl backdrop-blur-xl shadow-xl transition-all"
          title={config.soundEnabled ? '静音' : '开启剑鸣'}
        >
          {config.soundEnabled ? <Volume2 size={16} className="text-sky-400" /> : <VolumeX size={16} className="text-slate-500" />}
        </button>

        <button
          id="btn-export-standalone"
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-sky-600/80 to-blue-600/80 hover:from-sky-500 hover:to-blue-500 text-white border border-sky-400/40 rounded-xl backdrop-blur-xl shadow-xl transition-all text-xs font-semibold"
          title="导出无需构建的单文件 HTML"
        >
          <Download size={15} />
          <span>导出单文件</span>
        </button>

        <button
          id="btn-toggle-fullscreen"
          onClick={onToggleFullscreen}
          className="p-2.5 bg-slate-900/85 hover:bg-slate-800/90 text-slate-300 hover:text-sky-300 border border-slate-700/80 rounded-xl backdrop-blur-xl shadow-xl transition-all"
          title={isFullscreen ? '退出全屏' : '进入全屏'}
        >
          {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
        </button>
      </div>

      {/* Control Drawer Modal */}
      {isOpen && (
        <div
          id="controls-drawer"
          className="fixed left-6 bottom-20 z-40 w-84 bg-slate-950/90 backdrop-blur-2xl border border-slate-800 rounded-2xl shadow-2xl p-5 text-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200"
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Sliders size={16} className="text-sky-400" />
              <span className="font-bold text-sm text-sky-100 font-serif">剑道参数配置</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          <div className="space-y-4 text-xs max-h-[60vh] overflow-y-auto pr-1">
            {/* 1. Theme Selection */}
            <div>
              <label className="flex items-center gap-1.5 text-slate-300 font-semibold mb-2">
                <Palette size={14} className="text-sky-400" /> 灵剑道韵风格
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SWORD_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => onChangeConfig({ themeId: theme.id })}
                    className={`flex flex-col items-center p-2 rounded-xl border transition-all text-center ${
                      config.themeId === theme.id
                        ? 'border-sky-400 bg-sky-950/40 shadow-sm'
                        : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                    }`}
                  >
                    <div
                      className="w-4 h-4 rounded-full mb-1 shadow-md"
                      style={{ backgroundColor: theme.glowColor, boxShadow: `0 0 8px ${theme.glowColor}` }}
                    />
                    <span className="text-[11px] font-bold text-slate-200">{theme.name}</span>
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-1 italic font-serif text-center">
                "{currentTheme.description}"
              </p>
            </div>

            {/* 2. Sword Count */}
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Sparkles size={14} className="text-sky-400" /> 仙剑数量
                </span>
                <span className="font-mono text-sky-400">{config.swordCount} 柄</span>
              </div>
              <input
                type="range"
                min={30}
                max={300}
                step={10}
                value={config.swordCount}
                onChange={(e) => onChangeConfig({ swordCount: parseInt(e.target.value, 10) })}
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* 3. Max Speed */}
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span className="flex items-center gap-1.5">
                  <Zap size={14} className="text-amber-400" /> 御剑飞速
                </span>
                <span className="font-mono text-sky-400">{config.maxSpeed.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min={4}
                max={15}
                step={0.5}
                value={config.maxSpeed}
                onChange={(e) => onChangeConfig({ maxSpeed: parseFloat(e.target.value) })}
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* 4. Trail Length */}
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>剑气尾迹长度</span>
                <span className="font-mono text-sky-400">{config.trailLength}</span>
              </div>
              <input
                type="range"
                min={4}
                max={32}
                step={2}
                value={config.trailLength}
                onChange={(e) => onChangeConfig({ trailLength: parseInt(e.target.value, 10) })}
                className="w-full accent-sky-400 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
              />
            </div>

            {/* 5. Toggles */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="flex items-center justify-between cursor-pointer">
                <span>灵力共鸣阵线</span>
                <input
                  type="checkbox"
                  checked={config.showEnergyLines}
                  onChange={(e) => onChangeConfig({ showEnergyLines: e.target.checked })}
                  className="accent-sky-400 rounded w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span>阵型过渡平滑度</span>
                <span className="font-mono text-sky-400">极速响应</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Standalone HTML Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in">
          <div className="bg-slate-900 border border-sky-500/40 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative">
            <button
              onClick={() => setShowExportModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-2.5 mb-3">
              <div className="p-2 rounded-xl bg-sky-950/80 border border-sky-600/40 text-sky-400">
                <Code size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-sky-100 font-serif">单文件 HTML 独立运行包</h3>
                <p className="text-xs text-slate-400">纯本地单文件，双击即玩，包含 MediaPipe 手势与 Boids 剑阵</p>
              </div>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 space-y-2 mb-4">
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Check size={14} /> 零构建步骤 (Zero-Build)
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Check size={14} /> 逻辑完全嵌入在一个 &lt;script&gt; 标签内
              </div>
              <div className="flex items-center gap-2 text-emerald-400 font-medium">
                <Check size={14} /> 离线 Web Audio 剑鸣音效与 Canvas 纯硬核渲染
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={handleCopyCode}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold transition-all border border-slate-700"
              >
                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copied ? '已复制 HTML 源码' : '复制代码'}</span>
              </button>

              <button
                onClick={handleDownloadHTML}
                className="flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-semibold transition-all shadow-lg shadow-sky-950/50"
              >
                <Download size={14} />
                <span>下载 xianjian.html</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
