import { X } from 'lucide-react';

interface PromoBannerProps {
  visible: boolean;
  onDismiss: () => void;
}

export default function PromoBanner({ visible, onDismiss }: PromoBannerProps) {
  if (!visible) return null;

  return (
    <div className="bg-[#a435f0] text-white text-[12px] sm:text-[13px] px-4 py-2 font-medium flex items-center justify-between relative z-50">
      <div className="max-w-[1440px] mx-auto flex items-center justify-center gap-2 text-center">
        <span className="font-bold">⚡ Flash Sale:</span>
        <span>Get in-demand skills & launch your career with InternWala courses from $12.99.</span>
      </div>
      <button
        onClick={onDismiss}
        className="p-1 hover:bg-white/20 rounded transition shrink-0 ml-2 cursor-pointer"
        aria-label="Dismiss banner"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
