'use client';

import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Cake, Calculator, Archive } from 'lucide-react';
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
  () => import('@/components/recipe-history').then((mod) => mod.StockManager),
  {
    ssr: false,
    loading: () => <div className="space-y-4">
        <Skeleton className="w-full h-[700px] rounded-lg" />
    </div>,
  }
);

export default function Home() {
  const [activeView, setActiveView] = useState<'calculator' | 'stock'>('calculator');

  const views = {
    calculator: {
        title: "Calculadora de Custos",
        description: "Crie receitas, combine-as e calcule o preço final dos seus produtos.",
        component: <RecipeFlow />
    },
    stock: {
        title: "Gerenciador de Estoque",
        description: "Adicione e gerencie os ingredientes, materiais e outros itens do seu inventário.",
        component: <StockManager />
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
    </SidebarProvider>
  );
}
