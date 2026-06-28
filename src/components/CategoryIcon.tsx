import React from "react";
import {
  BookOpen,
  Users,
  Briefcase,
  CreditCard,
  User,
  CheckSquare,
  HelpCircle,
  LucideProps,
} from "lucide-react";
import { TaskCategory } from "../types";

interface CategoryIconProps {
  category: TaskCategory;
  className?: string;
}

export default function CategoryIcon({ category, className = "" }: CategoryIconProps) {
  switch (category) {
    case "Assignment":
      return <BookOpen className={`text-[#5B8CFF] ${className}`} />;
    case "Meeting":
      return <Users className={`text-[#A855F7] ${className}`} />;
    case "Interview":
      return <Briefcase className={`text-[#34D399] ${className}`} />;
    case "Bill":
      return <CreditCard className={`text-[#FF6B6B] ${className}`} />;
    case "Personal":
      return <User className={`text-yellow-400 ${className}`} />;
    case "Other":
      return <HelpCircle className={`text-gray-400 ${className}`} />;
    case "General":
    default:
      return <CheckSquare className={`text-teal-400 ${className}`} />;
  }
}

export function getCategoryBadgeStyles(category: TaskCategory): string {
  switch (category) {
    case "Assignment":
      return "bg-[#5B8CFF]/10 text-[#5B8CFF] border-[#5B8CFF]/20";
    case "Meeting":
      return "bg-[#A855F7]/10 text-[#A855F7] border-[#A855F7]/20";
    case "Interview":
      return "bg-[#34D399]/10 text-[#34D399] border-[#34D399]/20";
    case "Bill":
      return "bg-[#FF6B6B]/10 text-[#FF6B6B] border-[#FF6B6B]/20";
    case "Personal":
      return "bg-yellow-400/10 text-yellow-400 border-yellow-400/20";
    case "Other":
      return "bg-gray-400/10 text-gray-400 border-gray-400/20";
    case "General":
    default:
      return "bg-teal-400/10 text-teal-400 border-teal-400/20";
  }
}
