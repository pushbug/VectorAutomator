'use client';

import React from 'react';
import { BookOpen, X, Sparkles, HelpCircle, CheckCircle2 } from 'lucide-react';

interface KeywordGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeywordGuideModal({ isOpen, onClose }: KeywordGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div
      data-testid="keyword-guide-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4"
    >
      <div className="bg-surface border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-surface rounded-t-2xl shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <BookOpen size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Keyword Guidelines &amp; Metrics Guide</h2>
              <p className="text-xs text-muted">
                คู่มือทำความเข้าใจระดับประสิทธิภาพและตัวชี้วัดของคำค้นหาในพอร์ตโฟลิโอ
              </p>
            </div>
          </div>
          <button
            type="button"
            data-testid="keyword-guide-close-btn"
            onClick={onClose}
            className="text-muted hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/10 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-5 md:p-6 overflow-y-auto space-y-6 text-sm text-foreground">
          {/* Section 1: Performance Tiers */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>Keyword Performance Tiers (การแบ่งระดับประสิทธิภาพ)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Draw More */}
              <div className="p-3.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col gap-1.5 sm:col-span-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">💎</span>
                  <span className="font-bold text-purple-600 dark:text-purple-400">Draw More (ควรวาดเพิ่ม / High ROI Niche)</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  คำที่มี <strong>RPI สูงมาก (≥ $15/รูป)</strong> มียอดดาวน์โหลด <strong>≥ 3 ครั้ง</strong> แต่ยังมี <strong>รูปในพอร์ตน้อย (1–3 รูป)</strong> บ่งบอกว่าเป็นหัวข้อที่ตลาดต้องการสูงแต่เรายังมีของน้อย <strong>ควรรีบนำหัวข้อนี้ไปวาดงานใหม่เป็นชุดซีรีส์ 10–20 รูปด่วน</strong>
                </p>
              </div>

              {/* Star */}
              <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🌟</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">Star (คำทำเงินยอดเยี่ยม)</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  คำที่มีอัตราการแปลงยอดขายสูง (<strong>RPI ≥ $1.50</strong> หรือ <strong>RPD ≥ $1.00</strong> หรือ <strong>รายได้รวม ≥ $20</strong> หรือ <strong>ดาวน์โหลดรวม ≥ 25 ครั้ง</strong>) <strong>ควรนำไปใช้เป็น Core Keywords สำหรับผลงานใหม่ๆ ในหมวดเดียวกัน</strong>
                </p>
              </div>

              {/* Workhorse */}
              <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">📦</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400">Workhorse (คำหลักยอดนิยม)</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  คำพื้นฐานที่มียอดดาวน์โหลดและรายได้สม่ำเสมอ เป็นฐานทราฟฟิกหลักในการค้นหาของลูกค้าในตลาด Microstock
                </p>
              </div>

              {/* Dormant */}
              <div className="p-3.5 rounded-xl border border-amber-500/20 bg-amber-500/5 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">💤</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400">Dormant (คำที่ไม่มีการเคลื่อนไหว)</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  ถูกใช้ใน 3 ผลงานขึ้นไป แต่ยังไม่เคยมียอดดาวน์โหลดเลย <strong>ควรพิจารณาหลีกเลี่ยงหรือไม่นำไปใส่ในงานใหม่</strong>
                </p>
              </div>

              {/* Untested */}
              <div className="p-3.5 rounded-xl border border-border bg-muted/5 flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">⚪</span>
                  <span className="font-bold text-muted">Untested (คำใหม่ / รอดูผล)</span>
                </div>
                <p className="text-xs text-muted leading-relaxed">
                  คำที่เพิ่งนำมาใช้ในผลงานน้อยกว่า 3 ชิ้น และยังไม่มีประวัติยอดขาย อยู่ระหว่างการทดสอบในตลาด
                </p>
              </div>
            </div>

            <p className="text-[11px] text-muted/80 mt-2.5">
              * ลำดับการประเมิน Tier: ระบบจะตรวจสอบเกณฑ์ <strong>Draw More</strong> ก่อน หากไม่เข้าเกณฑ์จะประเมิน <strong>Star</strong> และ <strong>Workhorse</strong> ตามลำดับ
            </p>
          </div>

          {/* Section 2: Smart Features & Analysis */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
              <Sparkles size={14} />
              <span>Smart Analysis &amp; Automation (ฟังก์ชันวิเคราะห์อัจฉริยะ)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Velocity */}
              <div className="p-3.5 bg-surface/60 border border-border rounded-xl">
                <span className="font-semibold text-xs text-foreground font-mono block mb-1">⏱️ Time Range Velocity (ความเร็วรายได้)</span>
                <p className="text-xs text-muted leading-relaxed">
                  เลือกสลับช่วงเวลา <strong>30 Days / 90 Days / 1 Year / All Time</strong> เพื่อดูว่าคีย์เวิร์ดใดกำลังมาแรงหรือมียอดขายเติบโตต่อเนื่องในปัจจุบัน
                </p>
              </div>

              {/* Winning Recipe */}
              <div className="p-3.5 bg-surface/60 border border-border rounded-xl">
                <span className="font-semibold text-xs text-foreground font-mono block mb-1">🏆 Winning Tag Combinations (สูตรคำทำเงินร่วม)</span>
                <p className="text-xs text-muted leading-relaxed">
                  ในหน้าต่าง Action ระบบจะคำนวณคำที่ใช้คู่กันแล้วสร้างยอดขายสูงสุด พร้อมปุ่ม <strong>[ Copy Tag Recipe ]</strong> เพื่อนำชุดคำไปใส่ในงานใหม่ได้ในคลิกเดียว
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Table Columns */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-3 flex items-center gap-1.5">
              <HelpCircle size={14} />
              <span>Table Columns &amp; Metrics (ความหมายและประโยชน์ของหัวตาราง)</span>
            </h3>

            <div className="space-y-2.5">
              {/* TOP 5 Highlight Card */}
              <div className="p-3.5 bg-primary/5 border border-primary/20 rounded-xl">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                      TOP 5 (เช่น 4x, 1x, -)
                    </span>
                    <span className="text-xs font-semibold text-foreground">จำนวนผลงานที่ตั้งเป็น 5 คำแรก</span>
                  </div>
                  <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium">
                    🔥 High SEO Priority
                  </span>
                </div>
                <div className="text-xs text-muted space-y-1.5 leading-relaxed">
                  <p>
                    <strong>ความหมาย:</strong> แสดงจำนวนรูปภาพในพอร์ตที่คำนี้ถูกวางไว้ใน <strong>5 คำแรก</strong> (เช่น <code className="text-foreground font-mono">4x</code> = มี 4 ภาพที่คำนี้เป็น Top 5, ส่วน <code className="text-foreground font-mono">-</code> = เคยใช้ในพอร์ตแต่อยู่ลำดับที่ 6 เป็นต้นไป)
                  </p>
                  <p>
                    <strong>ทำไมถึงสำคัญ:</strong> อัลกอริทึมระบบค้นหาของเว็บ Microstock ชั้นนำ (เช่น <em>Adobe Stock</em> และ <em>Shutterstock</em>) ให้ค่าน้ำหนัก SEO กับ 5 คำแรกสูงสุด
                  </p>
                  <div className="p-2.5 rounded-lg bg-background/80 border border-border text-[11px] text-foreground space-y-1">
                    <p className="font-semibold text-primary">💡 กลยุทธ์การใช้งาน:</p>
                    <ul className="list-disc list-inside space-y-0.5 text-muted">
                      <li><strong className="text-foreground">คำที่ทำเงินสูง (Star / Draw More) แต่ TOP 5 เป็น "-" :</strong> คำนี้ขายดีอยู่แล้วแม้ไม่ได้ดันเป็น 5 คำแรก ควรนำไปตั้งเป็น 5 คำแรกในงานชุดใหม่เพื่อดันยอดขายให้พุ่งขึ้น</li>
                      <li><strong className="text-foreground">คำที่ TOP 5 สูง (เช่น 10x) แต่ยอดขายนิ่ง (Dormant) :</strong> การดันคำนี้ไม่เกิดผล ควรเปลี่ยนโควตา 5 คำแรกให้กับคำอื่นที่มี Conversion สูงกว่า</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-3 bg-surface/50 border border-border rounded-xl">
                  <span className="font-semibold text-xs text-foreground font-mono block mb-1">Keyword (พร้อมสัญลักษณ์ ✨)</span>
                  <p className="text-xs text-muted leading-relaxed">
                    ชื่อคำค้นหา สัญลักษณ์ ✨ จะแสดงเมื่อคำนี้เคยถูกจัดวางเป็น 5 คำแรกในบางผลงาน
                  </p>
                </div>

                <div className="p-3 bg-surface/50 border border-border rounded-xl">
                  <span className="font-semibold text-xs text-foreground font-mono block mb-1">Assets (จำนวนผลงาน)</span>
                  <p className="text-xs text-muted leading-relaxed">
                    จำนวนภาพเวกเตอร์ในพอร์ตที่ติดคำนี้ ช่วยประเมินว่าเราลงทุนวาดผลงานในธีมนี้มากน้อยเพียงใด
                  </p>
                </div>

                <div className="p-3 bg-surface/50 border border-border rounded-xl">
                  <span className="font-semibold text-xs text-foreground font-mono block mb-1">Downloads (ยอดดาวน์โหลด)</span>
                  <p className="text-xs text-muted leading-relaxed">
                    ยอดดาวน์โหลดรวมจากทุกภาพที่ใช้คำนี้ สะท้อนความต้องการ (Demand) จริงของตลาด
                  </p>
                </div>

                <div className="p-3 bg-surface/50 border border-border rounded-xl">
                  <span className="font-semibold text-xs text-foreground font-mono block mb-1">Earnings (รายได้รวม $)</span>
                  <p className="text-xs text-muted leading-relaxed">
                    ยอดเงินรวมที่สร้างได้จากผลงานที่มีคำนี้ จากทุกแพลตฟอร์ม (Adobe Stock, Shutterstock, Vecteezy)
                  </p>
                </div>

                <div className="p-3 bg-surface/50 border border-border rounded-xl">
                  <span className="font-semibold text-xs text-foreground font-mono block mb-1">RPI ($/Asset หรือ รายได้ต่อรูป)</span>
                  <p className="text-xs text-muted leading-relaxed">
                    <code className="text-primary font-bold">Earnings ÷ Assets</code> ช่วยบอกว่าคำนี้สร้างมูลค่าเฉลี่ยต่อ 1 รูปคุ้มค่าเพียงใด (รูปน้อยแต่ทำเงินสูง)
                  </p>
                </div>

                <div className="p-3 bg-surface/50 border border-border rounded-xl">
                  <span className="font-semibold text-xs text-foreground font-mono block mb-1">RPD ($/Download หรือ รายได้ต่อโหลด)</span>
                  <p className="text-xs text-muted leading-relaxed">
                    <code className="text-primary font-bold">Earnings ÷ Downloads</code> บ่งบอกมูลค่าประเภท License เช่น หาก RPD สูง (&gt; $1.00) แสดงว่ามักถูกซื้อด้วย Extended License
                  </p>
                </div>

                <div className="p-3 bg-surface/50 border border-border rounded-xl sm:col-span-2">
                  <span className="font-semibold text-xs text-foreground font-mono block mb-1">Action (👁️ ดูภาพผลงานที่เชื่อมโยง)</span>
                  <p className="text-xs text-muted leading-relaxed">
                    กดไอคอนดวงตาเพื่อเปิดดูภาพเวกเตอร์ทั้งหมดในพอร์ตที่ใช้คำค้นหานี้ พร้อมตรวจสอบสูตรคำคู่ทำเงิน (Winning Tags)
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-border bg-surface/50 flex items-center justify-end rounded-b-2xl shrink-0">
          <button
            type="button"
            data-testid="keyword-guide-got-it-btn"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs font-semibold shadow-xs transition-all cursor-pointer"
          >
            <CheckCircle2 size={15} />
            <span>เข้าใจแล้ว (Got it)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
