import React from 'react';
import { Plus } from 'lucide-react';
import Link from 'next/link';

export function DashboardExample() {
  return (
    <div className="bg-gradient-main min-h-screen p-8">
      <div className="topbar mb-8">
        <div className="logo">
          <span>FamilyBudget</span>
        </div>
        <div className="flex gap-4">
          <button className="nav-link">Áttekintés</button>
          <button className="nav-link">Beállítások</button>
          <button className="nav-link">Kijelentkezés</button>
        </div>
      </div>
      
      <div className="flex gap-6">
        <div className="sidebar hidden md:flex">
          <h3 className="sidebar-title">Menü</h3>
          <div className="flex flex-col gap-2">
            <div className="sidebar-link sidebar-link-active">
              <span>Irányítópult</span>
            </div>
            <div className="sidebar-link">
              <span>Bevételek</span>
            </div>
            <div className="sidebar-link">
              <span>Kiadások</span>
            </div>
            <div className="sidebar-link">
              <span>Költségvetés</span>
            </div>
            <div className="sidebar-link">
              <span>Jelentések</span>
            </div>
          </div>
        </div>
        
        <div className="flex-1">
          <div className="card mb-6">
            <h1 className="text-2xl font-bold mb-6">Családi Költségvetés</h1>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="dashboard-amount-box">
                <span className="text-sm text-gray-500">Bevétel</span>
                <span className="amount-income">315,000 Ft</span>
              </div>
              <div className="dashboard-amount-box">
                <span className="text-sm text-gray-500">Kiadás</span>
                <span className="amount-expense">127,500 Ft</span>
              </div>
              <div className="dashboard-amount-box">
                <span className="text-sm text-gray-500">Egyenleg</span>
                <span className="amount-balance">187,500 Ft</span>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-6">
              <button className="filter-btn filter-btn-selected">Összes</button>
              <button className="filter-btn">Élelmiszer</button>
              <button className="filter-btn">Rezsi</button>
              <button className="filter-btn">Közlekedés</button>
              <button className="filter-btn">Szórakozás</button>
            </div>
            
            <div className="form-box mb-6 p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <input className="input-search w-full" placeholder="Keresés..." />
                </div>
                <button className="btn-gradient md:w-auto">Új tranzakció</button>
              </div>
            </div>
            
            <table className="table-main">
              <thead className="thead-main">
                <tr>
                  <th className="p-3 text-left">Dátum</th>
                  <th className="p-3 text-left">Leírás</th>
                  <th className="p-3 text-left">Kategória</th>
                  <th className="p-3 text-right">Összeg</th>
                </tr>
              </thead>
              <tbody>
                <tr className="tr-hover border-b">
                  <td className="p-3">2025.06.20</td>
                  <td className="p-3">Heti bevásárlás</td>
                  <td className="p-3"><span className="badge-food">Élelmiszer</span></td>
                  <td className="p-3 text-right">-25,000 Ft</td>
                </tr>
                <tr className="tr-hover border-b">
                  <td className="p-3">2025.06.18</td>
                  <td className="p-3">Villany számla</td>
                  <td className="p-3"><span className="badge-bill">Rezsi</span></td>
                  <td className="p-3 text-right">-15,400 Ft</td>
                </tr>
                <tr className="tr-hover border-b">
                  <td className="p-3">2025.06.15</td>
                  <td className="p-3">Benzin</td>
                  <td className="p-3"><span className="badge-transport">Közlekedés</span></td>
                  <td className="p-3 text-right">-18,500 Ft</td>
                </tr>
                <tr className="tr-hover border-b">
                  <td className="p-3">2025.06.10</td>
                  <td className="p-3">Mozi</td>
                  <td className="p-3"><span className="badge-entertainment">Szórakozás</span></td>
                  <td className="p-3 text-right">-8,600 Ft</td>
                </tr>
              </tbody>
            </table>
          </div>
          
          <div className="card">
            <h2 className="text-xl font-bold mb-4">Új tranzakció hozzáadása</h2>
            <div className="form-box">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Típus</label>
                  <select className="input-main w-full">
                    <option>Kiadás</option>
                    <option>Bevétel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Kategória</label>
                  <select className="input-main w-full">
                    <option>Élelmiszer</option>
                    <option>Rezsi</option>
                    <option>Közlekedés</option>
                    <option>Szórakozás</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Összeg (Ft)</label>
                  <input className="input-main w-full" type="number" placeholder="10000" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dátum</label>
                  <input className="input-main w-full" type="date" />
                </div>
              </div>
              <div className="mt-4">
                <label className="block text-sm font-medium mb-2">Megjegyzés</label>
                <textarea className="input-main w-full" rows={3} placeholder="Megjegyzés..."></textarea>
              </div>
              <div className="mt-6">
                <button className="btn-gradient">Mentés</button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <Link href="/new-transaction" className="btn-fab">
        <Plus size={24} />
      </Link>
    </div>
  );
}
