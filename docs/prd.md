# Product Requirements Document (PRD)

**Project Name:** Microstock Auto-Pilot (Vector Contributor Automation)
**Document Version:** 1.1
**Platform:** Local Web App (Next.js / Node.js)

---

## 1. Executive Summary (บทสรุปผู้บริหาร)

Microstock Auto-Pilot คือระบบ Web Application ที่รันบน Localhost (สร้างด้วย Next.js) มีเป้าหมายเพื่อลดภาระงานแบบ Manual ซ้ำซ้อนของ Contributor ที่ผลิตงานประเภท Vector/Infographic โดยระบบจะผสานรวมความสามารถของ AI ในการวิเคราะห์เทรนด์, สร้าง Metadata (Title & Keywords) ระดับ High-Conversion, ฝังข้อมูลลงไฟล์ (EXIF/IPTC) ระดับ OS, อัปโหลดไฟล์ผ่าน SFTP อัตโนมัติ และทำหน้าที่เป็น Dashboard ศูนย์กลางในการจัดการพอร์ตโฟลิโอแทนที่การใช้ Google Keep และ Excel

## 2. Problem Statement (ปัญหาที่ต้องการแก้ไข)

ปัจจุบันกระบวนการทำงานหลังจากวาดภาพเสร็จใน Affinity Designer มีปัญหาดังนี้:

1. **Time-Consuming & Repetitive:** ต้องทำงานซ้ำซาก ทั้งการส่งภาพให้ AI คิดคีย์เวิร์ดทีละภาพ, เปลี่ยนชื่อไฟล์ (Rename) ด้วยตัวเอง, และอัปโหลดภาพผ่านเบราว์เซอร์ทีละเว็บ (Adobe Stock, ShutterStock)
2. **Metadata Accuracy & SEO:** AI แชทบอททั่วไปมักตั้งชื่อไฟล์ซ้ำซาก และให้คีย์เวิร์ดที่กว้างเกินไป ทำให้ภาพไม่ติดอันดับหน้าแรก (แม้จะเจาะกลุ่ม Niche อย่าง `infographic 2`, `timeline`, `milestone` แล้วก็ตาม)
3. **Scattered Data:** ข้อมูลกระจัดกระจาย (เก็บ Title/Keyword ใน Google Keep, เก็บรายได้และการดาวน์โหลดใน Excel, เก็บไฟล์ใน Google Drive) ทำให้ค้นหาคีย์เวิร์ดเก่าที่เคยขายดียาก และไม่สามารถวิเคราะห์ประสิทธิภาพของภาพรายตัว (Individual Performance) ได้
4. **Lack of Inspiration Guidance:** ขาดเครื่องมือช่วยวิเคราะห์ Data ของคู่แข่งในหน้าแรก เพื่อหาช่องว่าง (Gap) ในการผลิตงานชิ้นต่อไป

## 3. Scope of Work & Core Features (ขอบเขตการทำงานและฟีเจอร์หลัก)

ระบบจะถูกแบ่งการทำงานออกเป็น 4 โมดูลหลัก (สอดคล้องกับหน้า Tab บน GUI):

### Module 1: AI Daily Briefing (ระบบวิเคราะห์เทรนด์รายวัน)

- **Goal:** ให้ AI แนะนำแนวทางและคีย์เวิร์ดสำหรับงานชิ้นใหม่ (3-5 งาน/วัน)
- **Features:**
  - มี Input ให้ใส่ Keyword เป้าหมาย (เช่น `business infographic 4 steps`)
  - ระบบ Web Scraper ดึงข้อมูล Title และ Top 10 Keywords จากภาพที่ติดอันดับ 1-10 ของเว็บ Microstock
  - ส่งข้อมูลให้ Gemini API วิเคราะห์ และสรุปเป็น "การ์ดโจทย์งาน" ระบุ Concept, โทนสี, สไตล์, และ Target Keywords ที่ควรมี

### Module 2: AI Metadata & Process (ระบบจัดการไฟล์และฝังคีย์เวิร์ด)

- **Goal:** รับไฟล์จาก Affinity Designer มาประมวลผล Metadata แบบกึ่งอัตโนมัติ
- **Features:**
  - รองรับ Drag & Drop ไฟล์ `.eps` และ `.jpg`
  - **Competitor Keyword Finder:** เครื่องมือดึงคีย์เวิร์ดจากภาพที่คล้ายกัน (ทดแทนฟีเจอร์เดิมของ SS) โดยผู้ใช้สามารถใส่ภาพอ้างอิง หรือ คีย์เวิร์ดหลัก เพื่อดึง Top Keywords จากคู่แข่ง
  - เรียกใช้ Gemini Vision API สแกนภาพ JPG ประกอบกับ "คีย์เวิร์ดจากภาพที่ขายดีเดิม/คู่แข่ง" มาเป็น Guideline เพื่อสร้าง Title และ Keywords 50 คำ (จัดคำสำคัญที่สุด 5 คำแรก)
  - มี Text Editor บนเว็บให้ User ตรวจสอบและแก้ไขข้อความได้ก่อนบันทึก
  - ใช้เครื่องมือระดับ OS (เช่น ExifTool) ฝัง Title และ Keywords ลงไปในไฟล์ EPS และ JPG โดยตรง
  - ระบบ Auto-Rename เปลี่ยนชื่อไฟล์ตามปีและลำดับ หรือตามที่ AI แนะนำ

### Module 3: Auto-Uploader & Archiver (ระบบอัปโหลดและจัดเก็บอัตโนมัติ)

- **Goal:** ลดขั้นตอนการส่งงานผ่าน Browser และจัดเก็บไฟล์ลงเครื่อง/Cloud
- **Features:**
  - เมื่อยืนยัน Metadata จาก Module 2 ระบบจะเชื่อมต่อผ่าน SFTP เพื่ออัปโหลดไฟล์ EPS/JPG ไปยัง Adobe Stock และ ShutterStock อัตโนมัติ
  - ย้ายไฟล์ที่อัปโหลดสำเร็จ ไปจัดเก็บใน Local Folder ตามโครงสร้าง `Year > Month > Date` อย่างเป็นระบบ

### Module 4: Portfolio Dashboard (ศูนย์กลางข้อมูลผลงาน)

- **Goal:** แทนที่ Google Keep และ Excel ด้วย Web Dashboard
- **Features:**
  - **Gallery View:** แสดงภาพ Thumbnail ของงานที่อัปโหลดไปแล้ว พร้อม Date, Title และ Keywords
  - **Quick Copy:** มีปุ่มกดเพื่อ Copy Keywords ของภาพนั้นๆ ไปใช้กับงานใหม่ได้ทันที (Replicate ฟีเจอร์ที่หายไปของ SS)
  - **Search & Filter:** ค้นหางานตามวันที่ หรือคำค้นหาเฉพาะ
  - **Analytics:** นำเข้าไฟล์ CSV สถิติจากเว็บ Stock เพื่อแสดงกราฟยอดดาวน์โหลดและรายได้

## 4. User Interface (UI/UX)

พัฒนาด้วย **Next.js App Router** และ **Tailwind CSS v4.0** โครงสร้างประกอบด้วย:

- **Sidebar:** เมนูนำทาง (Navigation) ไปยังหน้าต่างๆ (Dashboard, Briefing, Upload, Portfolio)
- **Page 1: 💡 Daily Briefing:** ฟอร์มค้นหา -> ปุ่มรันประมวลผล -> Grid แสดงการ์ดโจทย์งาน
- **Page 2: 🚀 Process & Upload:** พื้นที่ File Uploader ขนาดใหญ่ -> รูป Preview -> กล่อง Text Area สำหรับ Title/Keyword เครื่องมือหาคีย์เวิร์ด -> ปุ่ม `[ฝัง Metadata]` และ `[อัปโหลด SFTP]`
- **Page 3: 📊 My Portfolio:** แถบค้นหา/ปฏิทิน -> ตาราง Image Grid เรียงภาพแบบ Pinterest -> ส่วนแสดงกราฟ Analytics ยอดดาวน์โหลดรายวัน

## 5. Technical Stack & Architecture

- **Frontend/Backend:** Next.js (App Router), TypeScript, Tailwind CSS v4.0
- **AI Model:** Google `@google/generative-ai` (Gemini)
- **Metadata Processing:** `exiftool` (ผ่าน child_process ใน Node.js)
- **Upload Protocol:** `ssh2-sftp-client` สำหรับการส่งไฟล์ SFTP
- **Web Scraping:** `Playwright` หรือ `cheerio`
- **Database:** `SQLite` (ผ่าน Prisma หรือ Drizzle ORM) สำหรับเก็บข้อมูล Local แทน Google Keep และ Excel

## 6. Out of Scope (สิ่งที่ไม่ครอบคลุมใน Phase 1)

- การสั่งให้โปรแกรม Affinity Designer ทำการ Export ไฟล์ EPS/JPG โดยอัตโนมัติ (User ยังต้องกด Export ด้วยตัวเอง)
- การดึงสถิติยอดดาวน์โหลดแบบ Real-time ผ่าน API ของแพลตฟอร์ม Stock (ใช้การโหลด CSV มาอัปโหลดเข้าระบบแทนไปก่อน)
- การกดปุ่ม Submit ส่งตรวจบนหน้าเว็บ Stock (User ต้องเข้าไปกด Submit ขั้นตอนสุดท้ายด้วยตัวเองเพื่อความปลอดภัยและป้องกันบัญชีถูกมองว่าเป็น Bot)

## 7. Execution Strategy (กลยุทธ์การพัฒนาผ่าน AI Agent)

เพื่อให้สอดคล้องกับโครงสร้างคำสั่ง `.think` -> `.plan` -> `.dev` ของระบบ:

1. **Phase 1:** พัฒนาระบบ Database (SQLite) และ Portfolio Dashboard (Tab 3) เพื่อเตรียมโครงสร้างพื้นฐานในการบันทึกข้อมูล
2. **Phase 2:** พัฒนา File Uploader และเชื่อมต่อ Gemini API (Tab 2) เพื่อรับ Input เป็นภาพและได้ Output เป็นข้อความ
3. **Phase 3:** รวมสคริปต์ ExifTool และ SFTP (Tab 2) ให้ทำงานสอดคล้องกัน
4. **Phase 4:** พัฒนาระบบ Web Scraping สำหรับ AI Daily Briefing (Tab 1)
