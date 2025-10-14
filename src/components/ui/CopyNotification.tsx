// src/components/ui/CopyNotification.tsx (หรือตามโครงสร้างโปรเจกต์ของคุณ)

import React from 'react';

interface CopyNotificationProps {
  isVisible: boolean;
}

export function CopyNotification({ isVisible }: CopyNotificationProps) {
  if (!isVisible) return null

  // ใช้ Tailwind CSS สำหรับการจัดวางที่กึ่งกลางด้านล่าง
  return (
    <div
      aria-live="polite"
      // ใช้ transition-opacity เพื่อให้มีการเปลี่ยนสถานะที่นุ่มนวล
      className={`fixed bottom-4 left-1/2 -translate-x-1/2 z-50
                 px-4 py-2 bg-gray-800 text-white text-sm rounded-lg shadow-xl
                 transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
      // หากต้องการให้แน่ใจว่ามันจะหายไปจริงๆ เมื่อ opacity เป็น 0 คุณสามารถใช้ style เพิ่มเติม
      // แต่การจัดการด้วย Tailwind Class (เช่นใช้ 'invisible' เมื่อ opacity เป็น 0) มักจะดีกว่า 
      // ในตัวอย่างนี้ เราใช้ `if (!isVisible) return null` ไปแล้ว
    >
      SVG Copied to Clipboard!
    </div>
  )
}