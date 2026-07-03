import React from "react";
import {
  Youtube,
  Facebook,
  Twitter,
  Github,
  Globe,
  Compass,
  FileText,
  Music,
  Tv,
  Instagram,
  Linkedin,
  MessageSquare,
  Figma,
  Share2,
  HardDrive,
  Eye,
  ThumbsUp,
  GitBranch,
  Star,
  BookOpen,
  Layers,
  Heart,
  ExternalLink
} from "lucide-react";

interface LinkPreviewProps {
  url: string;
}

// Map domains to their respective service key and info
const getLinkDetails = (urlStr: string) => {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase().replace("www.", "");
    const path = url.pathname;

    // List of supported platforms and their config
    if (host.includes("youtube.com") || host.includes("youtu.be")) {
      return {
        key: "youtube",
        name: "YouTube",
        color: "bg-red-500/10 border-red-500/20 text-red-500",
        icon: Youtube,
        title: "คู่มือเริ่มต้นสร้าง E2EE Secure Messaging System | Tech Talk Thailand",
        desc: "วีดีโออธิบายโครงสร้างพื้นฐานและการออกแบบระบบเข้ารหัสลับแบบ Zero Knowledge ด้วย Web Crypto API ในแอป Shush",
        badge: "วิดีโอยอดนิยม",
        meta: "ผู้เข้าชม 1.2M ครั้ง • 3 วันที่ผ่านมา",
        larger: true,
      };
    }
    if (host.includes("facebook.com")) {
      return {
        key: "facebook",
        name: "Facebook",
        color: "bg-blue-600/10 border-blue-600/20 text-blue-400",
        icon: Facebook,
        title: "สมาคมความลับและรหัสความปลอดภัยลับแห่งประเทศไทย",
        desc: "กลุ่มพูดคุยแลกเปลี่ยนเทคนิคการรักษาสิทธิความเป็นส่วนตัวและการเข้ารหัสลับข้อมูลในระดับแอปพลิเคชัน",
        badge: "โพสต์ยอดนิยม",
        meta: "ถูกใจ 45K คน • ความเห็น 3.2K รายการ",
        larger: true,
      };
    }
    if (host.includes("twitter.com") || host.includes("x.com")) {
      return {
        key: "x",
        name: "X (Twitter)",
        color: "bg-slate-800/20 border-slate-700 text-slate-200",
        icon: Twitter,
        title: "Security Insider (@sec_insider) on X",
        desc: "ระบบเข้ารหัสลับ E2EE ของ Shush ถือเป็นความก้าวหน้าครั้งสำคัญในการปกป้องข้อมูลเพื่อนสนิทและคู่รักให้ปลอดภัยที่สุด #PrivacyMatters #Cryptography",
        badge: "เทรนด์ล่าสุด",
        meta: "รีทวีต 12.8K ครั้ง • ถูกใจ 34K ครั้ง",
        larger: true,
      };
    }
    if (host.includes("github.com")) {
      const repo = path.split("/").slice(1, 3).join("/");
      return {
        key: "github",
        name: "GitHub",
        color: "bg-zinc-800/30 border-zinc-700 text-zinc-100",
        icon: Github,
        title: repo ? `${repo} - Zero Knowledge Workspace` : "Shush Secure Messaging Repository",
        desc: "คลังซอร์สโค้ดระบบแชทแบบ End-to-End Encryption ที่ปลอดภัยที่สุด พัฒนาด้วย React และ Node.js",
        badge: "Repository",
        meta: "Stars: 8.4K • Forks: 412 • Issues: 12",
        larger: true,
      };
    }
    if (host.includes("huggingface.co")) {
      return {
        key: "huggingface",
        name: "Hugging Face",
        color: "bg-amber-500/10 border-amber-500/20 text-amber-500",
        icon: Compass,
        title: "shush-labs/llama-3-e2ee-moderator",
        desc: "โมเดลปัญญาประดิษฐ์ขนาดเล็กที่ออกแบบมาเฉพาะสำหรับตรวจสอบความสุภาพของคำพูดโดยไม่ถอดรหัสข้อความผ่าน API ภายนอก",
        badge: "Model",
        meta: "Downloads: 24.5K • Likes: 890",
        larger: true,
      };
    }
    if (host.includes("gitlab.com")) {
      return {
        key: "gitlab",
        name: "GitLab",
        color: "bg-orange-500/10 border-orange-500/20 text-orange-500",
        icon: Github,
        title: "shush-org/core-cryptography-module",
        desc: "โมดูลแกนหลักสำหรับการจัดการและแลกเปลี่ยนคีย์คู่รหัสบนเครื่องไคลเอนต์ CI/CD pipeline ผ่านฉลุย 100%",
        badge: "Project",
        meta: "Stars: 1.2K • Pipelines: Passed",
        larger: true,
      };
    }
    if (host.includes("reddit.com")) {
      return {
        key: "reddit",
        name: "Reddit",
        color: "bg-orange-600/10 border-orange-600/20 text-orange-400",
        icon: MessageSquare,
        title: "r/privacy: How Shush manages to run E2EE smoothly on mobile browsers",
        desc: "กระทู้อภิปรายวิธีการทำงานของเทคโนโลยี Web Crypto API และ IndexedDB ในเบราว์เซอร์สมาร์ทโฟน",
        badge: "r/privacy",
        meta: "Upvotes: 12.5K • Comments: 489",
        larger: true,
      };
    }
    if (host.includes("wikipedia.org")) {
      return {
        key: "wikipedia",
        name: "Wikipedia",
        color: "bg-slate-100/10 border-slate-700 text-slate-300",
        icon: BookOpen,
        title: "การเข้ารหัสลับแบบกุญแจสาธารณะ (Public-key Cryptography)",
        desc: "สารานุกรมเสรีเกี่ยวกับกระบวนการทางคณิตศาสตร์ที่ Shush นำมาใช้เพื่อให้แน่ใจว่าบุคคลที่สามไม่สามารถอ่านข้อความของคุณได้",
        badge: "สารานุกรม",
        meta: "แก้ไขล่าสุดเมื่อ 2 วันก่อน • 15 หมวดหมู่ที่เกี่ยวข้อง",
        larger: true,
      };
    }
    if (host.includes("instagram.com")) {
      return {
        key: "instagram",
        name: "Instagram",
        color: "bg-pink-500/10 border-pink-500/20 text-pink-500",
        icon: Instagram,
        title: "ภาพถ่ายเบื้องหลังการออกแบบ UI สุดคราฟต์ของแอปพลิเคชัน Shush",
        desc: "ชมความเอาใจใส่ในรายละเอียดในการจัดระเบียบสเปซและพาเลทสีที่ถนอมสายตาสำหรับการคุยแชทกลางคืน",
        badge: "Instagram Photo",
        meta: "Likes: 120K • Comments: 890",
        larger: true,
      };
    }
    if (host.includes("tiktok.com")) {
      return {
        key: "tiktok",
        name: "TikTok",
        color: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
        icon: Tv,
        title: "วิดีโอสั้นอธิบาย E2EE ใน 60 วินาที @shush_security",
        desc: "ทำไมแฟนกันต้องคุยแชทลับเฉพาะที่ Shush? มาดูการเปรียบเทียบความปลอดภัยแบบเห็นภาพชัดเจน",
        badge: "Trending Video",
        meta: "Views: 5.4M • Likes: 1.2M",
        larger: true,
      };
    }
    if (host.includes("threads.net")) {
      return {
        key: "threads",
        name: "Threads",
        color: "bg-zinc-700/20 border-zinc-600 text-zinc-300",
        icon: Globe,
        title: "Threads by @shush_app",
        desc: "อัปเดตระบบ Onebox และ Linkbox วันนี้ รองรับการพรีวิวเว็บไซต์เกือบทุกประเภทในรูปแบบที่ตอบสนองรวดเร็ว",
        badge: "Threads Post",
        meta: "Likes: 3K • Replies: 120",
        larger: true,
      };
    }
    if (host.includes("bluesky") || host.includes("bsky.app")) {
      return {
        key: "bluesky",
        name: "Bluesky",
        color: "bg-sky-500/10 border-sky-500/20 text-sky-400",
        icon: Compass,
        title: "Bluesky Post - @shush.bsky.social",
        desc: "ยินดีต้อนรับชาวโปรโตคอลกระจายศูนย์ทุกคน! ร่วมสัมผัสความโปร่งใสและตรวจสอบความปลอดภัยที่แอป Shush",
        badge: "Bluesky Feed",
        meta: "Reposts: 1.4K • Likes: 4.8K",
        larger: true,
      };
    }
    if (host.includes("linkedin.com")) {
      return {
        key: "linkedin",
        name: "LinkedIn",
        color: "bg-blue-700/10 border-blue-700/20 text-blue-400",
        icon: Linkedin,
        title: "Shush Technologies - ปฏิวัติการสื่อสารส่วนบุคคล",
        desc: "หน้าโปรไฟล์บริษัทผู้พัฒนาเทคโนโลยีความปลอดภัยและนวัตกรรมส่งข้อมูลผ่านเครือข่ายที่มีผู้ใช้งานเติบโตสูงสุดในกลุ่มวัยรุ่น",
        badge: "Company Profile",
        meta: "พนักงาน 45 คน • ผู้ติดตาม 12K คน",
        larger: true,
      };
    }
    if (host.includes("discord.com") || host.includes("discord.gg")) {
      return {
        key: "discord",
        name: "Discord",
        color: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400",
        icon: MessageSquare,
        title: "เข้าร่วมเซิร์ฟเวอร์คอมมูนิตี้ Shush Developers",
        desc: "พูดคุย ปรึกษากลยุทธ์การออกแบบ UI ร่วมจัดประกวดไอเดียฟีเจอร์ และอัปเดตซอร์สโค้ดล่าสุดกับทีมนักพัฒนา",
        badge: "Discord Server Invite",
        meta: "ออนไลน์ 1,420 คน • สมาชิกทั้งหมด 12,500 คน",
        larger: true,
      };
    }
    if (host.includes("twitch.tv")) {
      return {
        key: "twitch",
        name: "Twitch",
        color: "bg-purple-600/10 border-purple-600/20 text-purple-400",
        icon: Tv,
        title: "ถ่ายทอดสด: ไลฟ์โค้ดระบบความปลอดภัยแอปพลิเคชันแบบสดๆ โดยทีมผู้พัฒนา",
        desc: "ตอบคำถามสดทุกข้อสงสัยเกี่ยวกับโครงสร้างสเปซ คู่รัก และ BFF รวมถึงวิธีจัดฟอร์นิเจอร์สัตว์เลี้ยง",
        badge: "Live Stream",
        meta: "ผู้ดูแล: ShushDev • สตรีมเมื่อ 1 ชั่วโมงก่อน",
        larger: true,
      };
    }
    if (host.includes("vimeo.com")) {
      return {
        key: "vimeo",
        name: "Vimeo",
        color: "bg-sky-400/10 border-sky-400/20 text-sky-400",
        icon: Tv,
        title: "Shush App: Brand Identity and Motion Design Showcase",
        desc: "วิดีโอความละเอียดสูงนำเสนอแนวคิดการสร้างสรรค์แบรนด์ Shush ภาพความคมชัดสูงและทรานซิชันที่สมบูรณ์แบบ",
        badge: "Vimeo Video",
        meta: "Likes: 1.4K • Plays: 12K",
        larger: true,
      };
    }
    if (host.includes("spotify.com")) {
      return {
        key: "spotify",
        name: "Spotify",
        color: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
        icon: Music,
        title: "เพลงสำหรับคู่รัก: 'Shush and Sweet Secret' (Official Playlist)",
        desc: "เพลย์ลิสต์เพลงฟังสบายๆ เหมาะสำหรับเปิดฟังคลอระหว่างแชทคุยความลับในห้องคุยส่วนตัวคู่รัก",
        badge: "Spotify Playlist",
        meta: "ความยาว 2 ชม. 45 นาที • ผู้ติดตามเพลย์ลิสต์ 85K คน",
        larger: true,
      };
    }
    if (host.includes("notion.so") || host.includes("notion.site")) {
      return {
        key: "notion",
        name: "Notion",
        color: "bg-zinc-100/10 border-zinc-700 text-zinc-300",
        icon: FileText,
        title: "Shush Wiki - สารานุกรมคู่มือการใช้งานสำหรับสมาชิก",
        desc: "เอกสารบันทึกรายละเอียดทั้งหมดเกี่ยวกับฟีเจอร์ Lenses, กล่องเก็บความลับ Vault, และการกู้คืนบัญชีอย่างปลอดภัย",
        badge: "Workspace เอกสาร",
        meta: "แก้ไขล่าสุดโดย Admin • 120 หน้าเอกสารย่อย",
        larger: true,
      };
    }
    if (host.includes("drive.google.com")) {
      return {
        key: "google-drive",
        name: "Google Drive",
        color: "bg-amber-600/10 border-amber-600/20 text-amber-400",
        icon: HardDrive,
        title: "Shush_App_Architecture_v2.pdf",
        desc: "เอกสารแบบแปลนระบบเครือข่ายและการแลกเปลี่ยนข้อมูลผ่านเซิร์ฟเวอร์แบบ No-Log WebSockets",
        badge: "Google Drive File",
        meta: "ขนาดไฟล์: 4.2 MB • ประเภท: PDF • สิทธิ์: เฉพาะกลุ่ม",
        larger: true,
      };
    }
    if (host.includes("dropbox.com")) {
      return {
        key: "dropbox",
        name: "Dropbox",
        color: "bg-blue-500/10 border-blue-500/20 text-blue-400",
        icon: HardDrive,
        title: "Shared Assets: Shush Brand Materials.zip",
        desc: "โฟลเดอร์รวบรวมไฟล์ดีไซน์ต้นฉบับ ไอคอน โลโก้ และโทนสีสำหรับนักพัฒนานำไปใช้งานต่อ",
        badge: "Dropbox Shared File",
        meta: "ขนาดไฟล์: 145 MB • อัปเดตล่าสุด: สัปดาห์ก่อน",
        larger: true,
      };
    }
    if (host.includes("onedrive.live.com") || host.includes("sharepoint.com")) {
      return {
        key: "onedrive",
        name: "OneDrive",
        color: "bg-sky-600/10 border-sky-600/20 text-sky-400",
        icon: HardDrive,
        title: "E2EE_Performance_Report_2026.xlsx",
        desc: "รายงานผลการทดสอบความเร็วในการเข้ารหัสความลับในเบราว์เซอร์เปรียบเทียบในสภาพแวดล้อมที่ต่างกัน",
        badge: "OneDrive Spreadsheet",
        meta: "ขนาดไฟล์: 820 KB • แก้ไขล่าสุด: วันนี้",
        larger: true,
      };
    }
    if (host.includes("figma.com")) {
      return {
        key: "figma",
        name: "Figma",
        color: "bg-pink-600/10 border-pink-600/20 text-pink-400",
        icon: Figma,
        title: "Shush UI Design System - Draft v2.1 (Active)",
        desc: "โครงการดีไซน์ระบบอินเตอร์เฟซแอปพลิเคชัน แผงควบคุมสัตว์เลี้ยง หน้าส่งแชท และทรานซิชันเลนส์ความยาวสเปซ",
        badge: "Figma File",
        meta: "ออกแบบโดย: Senior Product Designer • 14 หน้าโปรเจกต์",
        larger: true,
      };
    }
    if (host.includes("canva.com")) {
      return {
        key: "canva",
        name: "Canva",
        color: "bg-teal-500/10 border-teal-500/20 text-teal-400",
        icon: Layers,
        title: "Shush Marketing Pitch Deck Presentation",
        desc: "สไลด์นำเสนอแนวคิดความปลอดภัยและการถือกำเนิดขึ้นของแอปพลิเคชันเพื่อตอบโจทย์ผู้ใช้วัยรุ่นที่รักความเป็นส่วนตัว",
        badge: "Canva Presentation",
        meta: "ความยาว: 18 สไลด์ • ผู้เข้าชม: 1.5K คน",
        larger: true,
      };
    }
    if (host.includes("medium.com")) {
      return {
        key: "medium",
        name: "Medium",
        color: "bg-zinc-100/10 border-zinc-700 text-zinc-300",
        icon: FileText,
        title: "Why Zero-Knowledge Chat is the Future of Digital Romance",
        desc: "บทความเจาะลึกด้านความสัมพันธ์และการแบ่งแยกพื้นที่บนโลกดิจิทัล ทำไมเราถึงต้องมีเครื่องมือแชทส่วนตัวแยกย่อยเฉพาะทาง",
        badge: "Medium Blog",
        meta: "อ่าน 8 นาที • เขียนโดย @tech_romance",
        larger: true,
      };
    }
    if (host.includes("dev.to")) {
      return {
        key: "devto",
        name: "Dev.to",
        color: "bg-zinc-800/40 border-zinc-700 text-zinc-200",
        icon: Github,
        title: "How to encrypt images client-side with 100% security using Web Crypto API",
        desc: "คู่มือพร้อมสคริปต์วิธีการย่อขนาดรูปภาพและส่งเข้ารหัสผ่านคีย์ส่วนตัว-สาธารณะให้ทำงานได้ราบรื่นไม่สะดุด",
        badge: "Dev.to Article",
        meta: "ถูกใจ 1.4K ครั้ง • 48 ความเห็น",
        larger: true,
      };
    }

    // Default social share or generic link preview
    const isSocialHost = ["threads.net", "facebook.com", "instagram.com", "reddit.com", "x.com", "twitter.com", "tiktok.com", "bluesky"].some(s => host.includes(s));
    
    // Extract a nice title out of the URL path as a mock preview title
    const cleanPath = path.split("/").filter(Boolean).pop() || "";
    const mockTitle = cleanPath
      ? cleanPath.split(/[-_]/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ") + " | Web Preview"
      : `${url.hostname} Web Portal`;

    return {
      key: "generic",
      name: isSocialHost ? "Social Share" : "Website Preview",
      color: "bg-slate-800/10 border-slate-700 text-[var(--theme-text-primary)]",
      icon: isSocialHost ? Share2 : Globe,
      title: mockTitle,
      desc: `ลิงก์เชื่อมโยงไปยังหน้าภายนอกระบบเพื่อดูรายละเอียดเพิ่มเติม (${url.hostname}) ระบบคุ้มครองข้อมูลปลายทาง`,
      badge: isSocialHost ? "Social Preview" : "Link Preview",
      meta: `ลิงก์ภายนอก: ${url.hostname}`,
      larger: isSocialHost, // Larger layout for social previews
    };
  } catch (e) {
    return null;
  }
};

export const LinkPreview: React.FC<LinkPreviewProps> = ({ url }) => {
  const details = getLinkDetails(url);
  if (!details) return null;

  const IconComponent = details.icon;

  if (details.larger) {
    return (
      <div 
        id={`onebox_larger_${details.key}`}
        className={`mt-2.5 rounded-xl border p-3.5 ${details.color} transition-all hover:scale-[1.01] duration-200 shadow-md flex flex-col gap-2 min-w-[240px] max-w-full text-left`}
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--theme-border)]/20 pb-1.5 mb-1">
          <div className="flex items-center gap-1.5">
            <IconComponent className="w-4 h-4" />
            <span className="text-[10px] font-bold uppercase tracking-wider">{details.name}</span>
          </div>
          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-white/10 font-medium font-mono">
            {details.badge}
          </span>
        </div>

        <div className="flex flex-col gap-1 min-w-0">
          <h5 className="font-semibold text-xs sm:text-sm text-[var(--theme-text-primary)] leading-snug truncate">
            {details.title}
          </h5>
          <p className="text-[11px] text-[var(--theme-text-secondary)]/90 leading-relaxed line-clamp-2">
            {details.desc}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 mt-1.5 text-[10px] text-[var(--theme-text-secondary)]/80 font-medium border-t border-[var(--theme-border)]/15 pt-2">
          <span>{details.meta}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-[var(--theme-primary)] hover:underline flex-shrink-0"
          >
            เปิดลิงก์ <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    );
  }

  // Small compact Linkbox style
  return (
    <div 
      id={`linkbox_compact_${details.key}`}
      className={`mt-2 rounded-lg border p-2.5 ${details.color} transition-all hover:bg-white/5 duration-150 flex items-start gap-2.5 max-w-full text-left`}
    >
      <div className="p-1.5 bg-white/5 rounded-md flex-shrink-0">
        <IconComponent className="w-4 h-4 text-[var(--theme-primary)]" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[9px] font-bold uppercase tracking-wider text-[var(--theme-text-secondary)]">
            {details.name}
          </span>
          <span className="text-[8px] px-1 py-0.2 bg-white/5 rounded text-[var(--theme-text-secondary)] font-mono">
            {details.badge}
          </span>
        </div>
        <h5 className="font-semibold text-xs text-[var(--theme-text-primary)] truncate leading-snug">
          {details.title}
        </h5>
        <div className="flex items-center justify-between gap-2 mt-1 text-[9px] text-[var(--theme-text-secondary)]/80 font-mono">
          <span className="truncate">{url}</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-0.5 text-[var(--theme-primary)] hover:underline flex-shrink-0 font-sans"
          >
            เปิด <ExternalLink className="w-2.5 h-2.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
