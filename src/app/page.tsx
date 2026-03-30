"use client";

import dynamic from 'next/dynamic';
import React, { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Cake, Calculator, Archive, Store, ShoppingCart, CreditCard, Landmark, Plus } from 'lucide-react';
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
import { AdvancedFinalProductManager } from '@/components/AdvancedFinalProductManager';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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
  const [activeView, setActiveView] = useState<'home' | 'calculator' | 'stock' | 'platforms' | 'markets' | 'sales' | 'produtos-finais'>('home');
  const [walletOpen, setWalletOpen] = useState(false);

  const views = {
    home: {
        title: "Bem-vindo ao Custo Doce",
        description: "Gerencie seus custos, estoque e vendas com facilidade.",
        component: <HomePage setActiveView={setActiveView} />
    },
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
    },
    'produtos-finais': {
        title: "Produtos Finais Avançados",
        description: "Crie produtos com múltiplas massas e recheios, defina mão de obra e margem de lucro.",
        component: <AdvancedFinalProductManager />
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
                onClick={() => setActiveView('home')}
                isActive={activeView === 'home'}
                tooltip="Home"
              >
                <Cake />
                Home
              </SidebarMenuButton>
            </SidebarMenuItem>
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
                onClick={() => setActiveView('produtos-finais')}
                isActive={activeView === 'produtos-finais'}
                tooltip="Produtos Finais"
              >
                <Plus />
                Produtos Finais
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

function HomePage({ setActiveView }: { setActiveView: (view: any) => void }) {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border border-primary/20 p-8 md:p-12">
        <div className="relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Bem-vindo ao Custo Doce! 🎂</h2>
          <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
            Sua plataforma completa para gerenciar custos, estoque e vendas. Calcule preços com precisão, acompanhe seu estoque em tempo real e maximize seus lucros.
          </p>
          <Button size="lg" onClick={() => setActiveView('calculator')}>
            <Calculator className="mr-2 h-5 w-5" />
            Começar a Calcular
          </Button>
        </div>
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -z-10" />
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Funcionalidades</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">7+</p>
            <p className="text-sm text-muted-foreground mt-1">Ferramentas disponíveis</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Integração</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">100%</p>
            <p className="text-sm text-muted-foreground mt-1">Sincronizado com Firebase</p>
          </CardContent>
        </Card>
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <CardTitle className="text-sm font-semibold text-muted-foreground">Segurança</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">✓</p>
            <p className="text-sm text-muted-foreground mt-1">Dados seguros na nuvem</p>
          </CardContent>
        </Card>
      </div>

      {/* Features Grid */}
      <div>
        <h3 className="text-2xl font-bold mb-6">Principais Recursos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            {
              icon: <Calculator className="h-6 w-6" />,
              title: "Calculadora de Custos",
              description: "Crie receitas e calcule preços com múltiplas massas e recheios",
              action: () => setActiveView('calculator')
            },
            {
              icon: <Plus className="h-6 w-6" />,
              title: "Produtos Finais",
              description: "Gerencie produtos com mão de obra e margem de lucro",
              action: () => setActiveView('produtos-finais')
            },
            {
              icon: <Archive className="h-6 w-6" />,
              title: "Gerenciador de Estoque",
              description: "Controle seu estoque com fuzzy match e quantidade manual",
              action: () => setActiveView('stock')
            },
            {
              icon: <ShoppingCart className="h-6 w-6" />,
              title: "Registrar Vendas",
              description: "Registre vendas de estoque ou produtos finais",
              action: () => setActiveView('sales')
            },
            {
              icon: <Store className="h-6 w-6" />,
              title: "Plataformas",
              description: "Configure seus canais de venda e taxas",
              action: () => setActiveView('platforms')
            },
            {
              icon: <CreditCard className="h-6 w-6" />,
              title: "Carteira Digital",
              description: "Gerencie banco, caixa e valores retidos",
              action: () => setActiveView('home') // Abre a carteira
            }
          ].map((feature, idx) => (
            <Card key={idx} className="hover:border-primary/50 transition-colors cursor-pointer" onClick={feature.action}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="p-2 bg-primary/10 rounded-lg text-primary">
                    {feature.icon}
                  </div>
                </div>
                <CardTitle className="text-lg mt-4">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Tips Section */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle>💡 Dicas para Começar</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3">
            <div className="text-primary font-bold">1.</div>
            <div>
              <p className="font-semibold">Crie suas receitas</p>
              <p className="text-sm text-muted-foreground">Comece criando as massas e recheios que você usa</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-primary font-bold">2.</div>
            <div>
              <p className="font-semibold">Registre seu estoque</p>
              <p className="text-sm text-muted-foreground">Adicione os ingredientes e insumos que você tem</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-primary font-bold">3.</div>
            <div>
              <p className="font-semibold">Configure suas plataformas</p>
              <p className="text-sm text-muted-foreground">Adicione seus canais de venda e taxas</p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="text-primary font-bold">4.</div>
            <div>
              <p className="font-semibold">Comece a vender</p>
              <p className="text-sm text-muted-foreground">Registre suas vendas e acompanhe sua carteira</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
