import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileRecoveryModal } from './FileRecoveryModal';

vi.mock('../../utils/fileFormat', () => ({
  getFileSummary: vi.fn((data) => ({
    parts: data.parts?.length ?? 0,
    stocks: data.stocks?.length ?? 0,
    groups: data.groups?.length ?? 0
  }))
}));

const defaultProps = {
  isOpen: true,
  fileName: 'my-project.carvd',
  errors: ['Invalid part data at index 0', 'Missing group reference'],
  repairResult: null,
  onAttemptRepair: vi.fn(),
  onAcceptRepair: vi.fn(),
  onReject: vi.fn(),
  isRepairing: false
};

describe('FileRecoveryModal', () => {
  it('returns null when not open', () => {
    const { container } = render(<FileRecoveryModal {...defaultProps} isOpen={false} />);
    expect(container.innerHTML).toBe('');
  });

  it('renders modal title', () => {
    render(<FileRecoveryModal {...defaultProps} />);
    expect(screen.getByText('File Recovery Required')).toBeInTheDocument();
  });

  it('displays file name', () => {
    render(<FileRecoveryModal {...defaultProps} />);
    expect(screen.getByText('my-project.carvd')).toBeInTheDocument();
  });

  describe('initial state (no repair result)', () => {
    it('shows issues found', () => {
      render(<FileRecoveryModal {...defaultProps} />);
      expect(screen.getByText('Issues Found')).toBeInTheDocument();
      expect(screen.getByText('Invalid part data at index 0')).toBeInTheDocument();
      expect(screen.getByText('Missing group reference')).toBeInTheDocument();
    });

    it('shows warning about data loss', () => {
      render(<FileRecoveryModal {...defaultProps} />);
      expect(screen.getByText(/recovery may result in some data loss/)).toBeInTheDocument();
    });

    it('shows cancel and attempt recovery buttons', () => {
      render(<FileRecoveryModal {...defaultProps} />);
      expect(screen.getByText('Cancel')).toBeInTheDocument();
      expect(screen.getByText('Attempt Recovery')).toBeInTheDocument();
    });

    it('calls onAttemptRepair when clicking attempt recovery', () => {
      const onAttemptRepair = vi.fn();
      render(<FileRecoveryModal {...defaultProps} onAttemptRepair={onAttemptRepair} />);
      fireEvent.click(screen.getByText('Attempt Recovery'));
      expect(onAttemptRepair).toHaveBeenCalled();
    });

    it('calls onReject when clicking cancel', () => {
      const onReject = vi.fn();
      render(<FileRecoveryModal {...defaultProps} onReject={onReject} />);
      fireEvent.click(screen.getByText('Cancel'));
      expect(onReject).toHaveBeenCalled();
    });
  });

  describe('repairing state', () => {
    it('shows repair in progress message', () => {
      render(<FileRecoveryModal {...defaultProps} isRepairing={true} />);
      expect(screen.getByText('Attempting to repair file...')).toBeInTheDocument();
    });

    it('hides action buttons while repairing', () => {
      render(<FileRecoveryModal {...defaultProps} isRepairing={true} />);
      expect(screen.queryByText('Cancel')).not.toBeInTheDocument();
      expect(screen.queryByText('Attempt Recovery')).not.toBeInTheDocument();
    });
  });

  describe('repair successful', () => {
    const successResult = {
      success: true,
      repairActions: ['Fixed part data at index 0', 'Rebuilt group structure'],
      warnings: ['Some custom colors may have been lost'],
      remainingErrors: [],
      repairedData: {
        version: '1.0',
        parts: [{ id: '1' }, { id: '2' }],
        stocks: [{ id: 's1' }],
        groups: [{ id: 'g1' }],
        groupMembers: []
      }
    };

    it('shows recovery successful', () => {
      render(<FileRecoveryModal {...defaultProps} repairResult={successResult as never} />);
      expect(screen.getByText('Recovery Successful')).toBeInTheDocument();
    });

    it('shows repair actions', () => {
      render(<FileRecoveryModal {...defaultProps} repairResult={successResult as never} />);
      expect(screen.getByText('Repairs Made')).toBeInTheDocument();
      expect(screen.getByText('Fixed part data at index 0')).toBeInTheDocument();
      expect(screen.getByText('Rebuilt group structure')).toBeInTheDocument();
    });

    it('shows warnings', () => {
      render(<FileRecoveryModal {...defaultProps} repairResult={successResult as never} />);
      expect(screen.getByText('Warnings')).toBeInTheDocument();
      expect(screen.getByText('Some custom colors may have been lost')).toBeInTheDocument();
    });

    it('shows recovered data summary', () => {
      render(<FileRecoveryModal {...defaultProps} repairResult={successResult as never} />);
      expect(screen.getByText('Recovered Data')).toBeInTheDocument();
      expect(screen.getByText('Parts')).toBeInTheDocument();
      expect(screen.getByText('Stocks')).toBeInTheDocument();
      expect(screen.getByText('Groups')).toBeInTheDocument();
      // Verify counts are rendered in the summary stat elements
      const statElements = screen.getByText('Recovered Data').closest('div')!.querySelectorAll('.text-\\[18px\\]');
      expect(statElements).toHaveLength(3);
    });

    it('shows accept and reject buttons', () => {
      render(<FileRecoveryModal {...defaultProps} repairResult={successResult as never} />);
      expect(screen.getByText('Accept & Open')).toBeInTheDocument();
      expect(screen.getByText('Reject & Cancel')).toBeInTheDocument();
    });

    it('calls onAcceptRepair when clicking accept', () => {
      const onAcceptRepair = vi.fn();
      render(
        <FileRecoveryModal {...defaultProps} repairResult={successResult as never} onAcceptRepair={onAcceptRepair} />
      );
      fireEvent.click(screen.getByText('Accept & Open'));
      expect(onAcceptRepair).toHaveBeenCalled();
    });

    it('calls onReject when clicking reject', () => {
      const onReject = vi.fn();
      render(<FileRecoveryModal {...defaultProps} repairResult={successResult as never} onReject={onReject} />);
      fireEvent.click(screen.getByText('Reject & Cancel'));
      expect(onReject).toHaveBeenCalled();
    });

    it('hides warnings when empty', () => {
      const result = { ...successResult, warnings: [] };
      render(<FileRecoveryModal {...defaultProps} repairResult={result as never} />);
      expect(screen.queryByText('Warnings')).not.toBeInTheDocument();
    });

    it('hides repair actions when empty', () => {
      const result = { ...successResult, repairActions: [] };
      render(<FileRecoveryModal {...defaultProps} repairResult={result as never} />);
      expect(screen.queryByText('Repairs Made')).not.toBeInTheDocument();
    });
  });

  describe('repair failed', () => {
    const failResult = {
      success: false,
      repairActions: [],
      warnings: [],
      remainingErrors: ['Corrupted data structure', 'Unrecoverable part data'],
      repairedData: null
    };

    it('shows recovery failed', () => {
      render(<FileRecoveryModal {...defaultProps} repairResult={failResult as never} />);
      expect(screen.getByText('Recovery Failed')).toBeInTheDocument();
    });

    it('shows remaining errors', () => {
      render(<FileRecoveryModal {...defaultProps} repairResult={failResult as never} />);
      expect(screen.getByText('Corrupted data structure')).toBeInTheDocument();
      expect(screen.getByText('Unrecoverable part data')).toBeInTheDocument();
    });

    it('shows only close button', () => {
      render(<FileRecoveryModal {...defaultProps} repairResult={failResult as never} />);
      expect(screen.getByText('Close')).toBeInTheDocument();
      expect(screen.queryByText('Accept & Open')).not.toBeInTheDocument();
      expect(screen.queryByText('Attempt Recovery')).not.toBeInTheDocument();
    });

    it('calls onReject when clicking close', () => {
      const onReject = vi.fn();
      render(<FileRecoveryModal {...defaultProps} repairResult={failResult as never} onReject={onReject} />);
      fireEvent.click(screen.getByText('Close'));
      expect(onReject).toHaveBeenCalled();
    });
  });
});
