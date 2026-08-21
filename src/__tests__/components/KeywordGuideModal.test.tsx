import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { KeywordGuideModal } from '@/components/keywords/KeywordGuideModal';

describe('KeywordGuideModal Component', () => {
  it('renders all performance tiers and table metrics explanations', () => {
    render(<KeywordGuideModal isOpen={true} onClose={vi.fn()} />);

    expect(screen.getByTestId('keyword-guide-modal')).toBeInTheDocument();
    expect(screen.getByText(/Keyword Guidelines & Metrics Guide/i)).toBeInTheDocument();

    // Tiers
    expect(screen.getByText(/Draw More \(ควรวาดเพิ่ม \/ High ROI Niche\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Star \(คำทำเงินยอดเยี่ยม\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Workhorse \(คำหลักยอดนิยม\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Dormant \(คำที่ไม่มีการเคลื่อนไหว\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Untested \(คำใหม่ \/ รอดูผล\)/i)).toBeInTheDocument();

    // Smart Analysis
    expect(screen.getByText(/Time Range Velocity/i)).toBeInTheDocument();
    expect(screen.getByText(/Winning Tag Combinations/i)).toBeInTheDocument();

    // Column metrics
    expect(screen.getByText(/TOP 5 \(เช่น 4x, 1x, -\)/i)).toBeInTheDocument();
    expect(screen.getByText(/จำนวนผลงานที่ตั้งเป็น 5 คำแรก/i)).toBeInTheDocument();
    expect(screen.getByText(/Keyword \(พร้อมสัญลักษณ์ ✨\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Assets \(จำนวนผลงาน\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Downloads \(ยอดดาวน์โหลด\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Earnings \(รายได้รวม \$\)/i)).toBeInTheDocument();
    expect(screen.getByText(/RPI \(\$\/Asset หรือ รายได้ต่อรูป\)/i)).toBeInTheDocument();
    expect(screen.getByText(/RPD \(\$\/Download หรือ รายได้ต่อโหลด\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Action \(👁️ ดูภาพผลงานที่เชื่อมโยง\)/i)).toBeInTheDocument();
  });

  it('triggers onClose when close button or Got It button is clicked', () => {
    const onClose = vi.fn();
    render(<KeywordGuideModal isOpen={true} onClose={onClose} />);

    const closeBtn = screen.getByTestId('keyword-guide-close-btn');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);

    const gotItBtn = screen.getByTestId('keyword-guide-got-it-btn');
    fireEvent.click(gotItBtn);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('renders null when isOpen is false', () => {
    const { container } = render(<KeywordGuideModal isOpen={false} onClose={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
