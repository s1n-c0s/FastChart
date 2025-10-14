// src/components/ui/CopyNotification.tsx

import React from 'react';

interface CopyNotificationProps {
  isVisible: boolean;
}

export function CopyNotification({ isVisible }: CopyNotificationProps) {
  
  // คลาสพื้นฐาน: ใช้ transition-all และ ease-in
  const baseClasses = `
    fixed bottom-4 left-1/2 z-50
    px-4 py-2 bg-green-500 text-white text-sm rounded-lg shadow-xl
    transition-all duration-200 ease-in transform
  `;
  
  // คลาสตามสถานะ: ควบคุมการเคลื่อนไหวและการซ่อน
  const stateClasses = isVisible
    // สถานะปรากฏ: ลอยขึ้นไป 1rem
    ? 'opacity-100 -translate-y-4'
    // สถานะซ่อน: อยู่ที่ตำแหน่งเดิม, มองไม่เห็น
    : 'opacity-0 translate-y-0';
    
  // คลาสสำหรับจัดกึ่งกลาง:
  const centerClass = '-translate-x-1/2';
  
  // 💡 ไม่ต้องใช้ if (!isVisible) return null; อีกต่อไป
  
  return (
    <div
      aria-live="polite"
      className={`${baseClasses} ${centerClass} ${stateClasses}`}
    >
      SVG Copied to Clipboard!
    </div>
  )
}