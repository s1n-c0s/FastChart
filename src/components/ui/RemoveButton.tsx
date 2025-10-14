// src/components/ui/RemoveButton.tsx (หรือตามโครงสร้างโปรเจกต์ของคุณ)

import React from 'react';
// สมมติว่าคุณกำลังใช้ Lucide icons หรือไลบรารีที่คล้ายกัน
// หากไม่มี Lucide icon library ติดตั้งอยู่ คุณอาจจะต้องใช้ไอคอน SVG หรือไอคอนตัวอักษรแทน
// ในตัวอย่างนี้ ผมจะใช้ไอคอน X แบบพื้นฐาน
// หากคุณใช้ Shadcn/ui หรืออื่นๆ ให้ปรับ import ตามความเหมาะสม
// import { X } from 'lucide-react'; 

interface RemoveButtonProps {
  onClick: () => void;
  label: string;
}

export function RemoveButton({ onClick, label }: RemoveButtonProps) {
  return (
    <button
      onClick={onClick}
      aria-label={`Remove row: ${label}`}
      className="p-1 rounded-md transition-colors duration-200
                 text-gray-500 hover:text-white
                 hover:bg-red-500 active:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
    >
      {/* ใช้องค์ประกอบที่คล้ายไอคอน X */}
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        stroke="currentColor" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      >
        <path d="M18 6L6 18" />
        <path d="M6 6L18 18" />
      </svg>
    </button>
  )
}