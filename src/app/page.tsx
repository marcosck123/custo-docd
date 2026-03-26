'use client';

import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Cake, Calculator, Archive, Store, ShoppingCart, CreditCard, Landmark } from 'lucide-react';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { WalletPopup } from '@/components/business/WalletPopup';

const RecipeFlow = dynamic(
  () => import('@/components/recipe-calculator').then((mod) => mod.RecipeFlow),
  {
    ssr: false,
    loading: () => <div className="space-y-4">
        <Skeleton className="w-full h-[700px] rounded-lg" />
    </div>,
  }
);
const StockManager = dynamic(
  () => import('@/components/Stock/StockManager').then((mod) => mod.StockManager),
  {
    ssr: false,
    loading: () => <div className="space-y-4">
        <Skeleton className="w-full h-[700px] rounded-lg" />
    </div>,
  }
);
const CategoriesManager = dynamic(
  () => import('@/components/business/CategoriesManager').then((mod) => mod.CategoriesManager),
  {
    ssr: false,
    loading: () => <div className="space-y-4">
        <Skeleton className="w-full h-[420px] rounded-lg" />
    </div>,
  }
);
const SalesManager = dynamic(
  () => import('@/components/business/SalesManager').then((mod) => mod.SalesManager),
  {
    ssr: false,
    loading: () => <div className="space-y-4">
        <Skeleton className="w-full h-[520px] rounded-lg" />
    </div>,
  }
);

export default function Home() {
  const [activeView, setActiveView] = useState<'calculator' | 'stock' | 'platforms' | 'markets' | 'sales'>('calculator');
  const [walletOpen, setWalletOpen] = useState(false);

  const views = {
    calculator: {
        title: "Calculadora de Custos",
        description: "Crie receitas, combine-as e calcule o preço final dos seus produtos.",
        component: <RecipeFlow />
    },
    stock: {
        title: "Gerenciador de Estoque",
        description: "Registre entradas, edite itens existentes e acompanhe o inventário sem sair do fluxo atual.",
        component: <StockManager />
    },
    platforms: {
        title: "Plataformas",
        description: "Cadastre canais de venda e configure taxas para aplicar no checkout de vendas.",
        component: <CategoriesManager mode="platforms" />
    },
    markets: {
        title: "Mercados",
        description: "Organize fornecedores e locais de compra usados nas entradas do estoque.",
        component: <CategoriesManager mode="markets" />
    },
    sales: {
        title: "Registrar Venda",
        description: "Calcule a taxa da plataforma, registre a venda e lance o valor líquido na carteira.",
        component: <SalesManager />
    }
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <div className="inline-block bg-primary/10 p-2 rounded-full">
              <Cake className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl text-foreground font-headline tracking-tight">
              Custo Doce
            </h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveView('calculator')}
                isActive={activeView === 'calculator'}
                tooltip="Calculadora"
              >
                <Calculator />
                Calculadora
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveView('stock')}
                isActive={activeView === 'stock'}
                tooltip="Estoque"
              >
                <Archive />
                Estoque
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveView('sales')}
                isActive={activeView === 'sales'}
                tooltip="Registrar Venda"
              >
                <ShoppingCart />
                Registrar Venda
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveView('platforms')}
                isActive={activeView === 'platforms'}
                tooltip="Plataformas"
              >
                <Store />
                Plataformas
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setActiveView('markets')}
                isActive={activeView === 'markets'}
                tooltip="Mercados"
              >
                <Landmark />
                Mercados
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setWalletOpen(true)}
                isActive={walletOpen}
                tooltip="Carteira"
              >
                <CreditCard />
                Carteira
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <main className="p-4 md:p-8">
          <div className="flex items-center gap-4 mb-8">
            <SidebarTrigger className="md:hidden"/>
            <div>
                 <h1 className="text-3xl md:text-4xl font-bold tracking-tight">{views[activeView].title}</h1>
                 <p className="text-muted-foreground mt-1">{views[activeView].description}</p>
            </div>
          </div>
          
          {views[activeView].component}
        </main>
      </SidebarInset>
      <WalletPopup open={walletOpen} onOpenChange={setWalletOpen} />
    </SidebarProvider>
  );
}
