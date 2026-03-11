import { RecipeFlow } from '@/components/recipe-calculator';
import { StockManager } from '@/components/recipe-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Home() {
  return (
    <main className="container mx-auto px-4 py-8 md:py-12">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold text-primary font-headline tracking-tight">Custo Doce</h1>
        <p className="text-muted-foreground mt-2">Sua calculadora de custo de receitas para confeitaria.</p>
      </header>
      <Tabs defaultValue="calculator" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="calculator">Calculadora</TabsTrigger>
          <TabsTrigger value="stock">Estoque</TabsTrigger>
        </TabsList>
        <TabsContent value="calculator">
          <RecipeFlow />
        </TabsContent>
        <TabsContent value="stock">
          <StockManager />
        </TabsContent>
      </Tabs>
    </main>
  );
}
