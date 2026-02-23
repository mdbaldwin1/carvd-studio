import { CutList } from '../../types';

export function CutListStatistics({ cutList }: { cutList: CutList }) {
  return (
    <div className="cut-list-statistics flex w-full items-center py-3 px-6 border-t border-border bg-bg">
      <div className="stat-item flex-1 flex flex-col items-center gap-0.5 px-3 border-r border-border">
        <span className="text-[11px] text-text-muted uppercase tracking-wide">Parts</span>
        <span className="text-[16px] font-semibold text-text leading-none">{cutList.statistics.totalParts}</span>
      </div>
      <div className="stat-item flex-1 flex flex-col items-center gap-0.5 px-3 border-r border-border">
        <span className="text-[11px] text-text-muted uppercase tracking-wide">Boards</span>
        <span className="text-[16px] font-semibold text-text leading-none">{cutList.statistics.totalStockBoards}</span>
      </div>
      <div className="stat-item flex-1 flex flex-col items-center gap-0.5 px-3 border-r border-border">
        <span className="text-[11px] text-text-muted uppercase tracking-wide">Board Feet</span>
        <span className="text-[16px] font-semibold text-text leading-none">
          {cutList.statistics.totalBoardFeet.toFixed(2)}
        </span>
      </div>
      <div className="stat-item flex-1 flex flex-col items-center gap-0.5 px-3 border-r border-border">
        <span className="text-[11px] text-text-muted uppercase tracking-wide">Waste</span>
        <span className="text-[16px] font-semibold text-text leading-none">
          {cutList.statistics.wastePercentage.toFixed(1)}%
        </span>
      </div>
      <div className="stat-item flex-1 flex flex-col items-center gap-0.5 px-3">
        <span className="text-[11px] text-text-muted uppercase tracking-wide">Est. Cost</span>
        <span className="text-[16px] font-semibold text-text leading-none">
          ${cutList.statistics.estimatedCost.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
