import { CutList } from '../../types';

export function CutListStatistics({ cutList }: { cutList: CutList }) {
  return (
    <div className="cut-list-statistics">
      <div className="stat-item">
        <span className="stat-label">Parts</span>
        <span className="stat-value">{cutList.statistics.totalParts}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Boards</span>
        <span className="stat-value">{cutList.statistics.totalStockBoards}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Board Feet</span>
        <span className="stat-value">{cutList.statistics.totalBoardFeet.toFixed(2)}</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Waste</span>
        <span className="stat-value">{cutList.statistics.wastePercentage.toFixed(1)}%</span>
      </div>
      <div className="stat-item">
        <span className="stat-label">Est. Cost</span>
        <span className="stat-value">${cutList.statistics.estimatedCost.toFixed(2)}</span>
      </div>
    </div>
  );
}
