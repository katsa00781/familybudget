"use client";

import Link from "next/link";
import { Button } from "../ui/button";
import { 
  Sheet, 
  SheetContent, 
  SheetTrigger 
} from "../ui/sheet";
import { 
  Menu, BarChart2, CircleDollarSign, User, ChefHat, 
  ShoppingCart, TrendingUpIcon, Package, PiggyBank,
  Users, Home, HelpCircle
} from "lucide-react";
import { useState } from "react";
import { useUserProfile } from '@/src/hooks/useUserProfile';

interface SidebarProps {
  className?: string;
}

export default function Sidebar({ className = "" }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { getUserDisplayName, getUserInitials, getUserLastName, getFamilyName } = useUserProfile();

  const sidebarMenuItems = [
    { icon: <BarChart2 size={20} />, label: 'Áttekintés', href: '/attekintes' },
    { icon: <CircleDollarSign size={20} />, label: 'Bérkalkulátor', href: '/berkalkulator' },
    { icon: <Home size={20} />, label: 'Költségvetés', href: '/koltsegvetes' },
    { icon: <TrendingUpIcon size={20} />, label: 'Bevételek', href: '/bevetelek' },
    { icon: <ShoppingCart size={20} />, label: 'Bevásárlás', href: '/bevasarlas' },
    { icon: <Package size={20} />, label: 'Termékek', href: '/termekek' },
    { icon: <TrendingUpIcon size={20} />, label: 'Befektetések', href: '/befektetesek' },
    { icon: <PiggyBank size={20} />, label: 'Megtakarítások', href: '/jelentesek' },
    { icon: <ChefHat size={20} />, label: 'Receptek', href: '/receptek' },
    { icon: <User size={20} />, label: 'Profil', href: '/profil' },
    { icon: <HelpCircle size={20} />, label: 'Segítség', href: '/segitseg' }
  ];

  const SidebarContent = () => (
    <>
      {/* Familie header */}
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-medium text-gray-900">
            {getFamilyName()} {getUserLastName() && `- ${getUserLastName()}`}
          </span>
        </div>
      </div>
      
      {/* User info */}
      <div className="px-6 mb-6">
        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
          <div className="w-8 h-8 bg-gradient-to-br from-cyan-400 to-teal-500 rounded-full flex items-center justify-center">
            <span className="text-white text-sm font-medium">{getUserInitials()}</span>
          </div>
          <div className="text-sm">
            <div className="font-medium text-gray-900">{getUserDisplayName()}</div>
            <div className="text-gray-500">Tulajdonos</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        {sidebarMenuItems.map((item, index) => (
          <Link
            key={index}
            href={item.href}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium mb-1 transition-colors text-gray-700 hover:bg-gray-50 hover:text-cyan-700"
            onClick={() => setIsOpen(false)}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>
    </>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex w-64 bg-white border-r border-gray-200 flex-col ${className}`}>
        <SidebarContent />
      </aside>

      {/* Mobile/Tablet Hamburger Menu */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-white shadow-md">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex flex-col h-full">
              <SidebarContent />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
